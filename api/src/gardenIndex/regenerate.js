const { createHash } = require('node:crypto');
const { logger } = require('firebase-functions/v2');
const { projectID } = require('firebase-functions/params');
const { getFunctions } = require('firebase-admin/functions');
const { db, changeData, getFunctionUrl } = require('../firebase');
const { systemDoc } = require('../collections');
const { generateListedGardensFile, isPublicProjectionChanged } = require('./generate');

// Debounced regeneration of the listed gardens file, driven by campsite writes.
//
// Semantics: leading + trailing edge throttle with a window of `windowMs()`.
// - The first relevant write after a quiet period regenerates immediately (leading edge).
// - Writes that arrive while a regeneration is scheduled or running are coalesced:
//   they only bump `changeSeq`. When the running regeneration finishes, it schedules
//   one trailing run at the end of the window if anything changed in the meantime.
// - So at most one regeneration starts per window, and every write is eventually
//   reflected in a regeneration that started after it.
//
// The state lives in the admin-only `system/garden-regen` document. All state
// transitions happen in Firestore transactions, so concurrent trigger invocations
// are safe. Duplicate task deliveries are rejected via `taskSeq`.

/** Name of the Cloud Tasks function, as exported from index.js */
const TASK_FUNCTION_NAME = 'regenerateGardenIndex';
/** A pending task is presumed lost after this, and a new write will schedule a new one */
const STALE_MS = 10 * 60_000;

/**
 * Minimum time between the starts of two regenerations.
 * Kept short in local/CI emulators, so (e2e) tests don't wait on it.
 *
 * Note: this likely has no effect until this bug is fixed
 * https://github.com/firebase/firebase-tools/issues/8254
 */
const windowMs = () => (projectID.value().startsWith('demo-') ? 2_000 : 30_000);

/**
 * @typedef {{
 *   lastRegenAt: number;
 *   changeSeq: number;
 *   pending: boolean;
 *   taskSeq: number;
 *   scheduledFor: number;
 * }} GardenRegenState
 * All times are epoch milliseconds.
 * - `lastRegenAt`: start of the last (claimed) regeneration
 * - `changeSeq`: incremented on every relevant campsite write
 * - `pending`: a regeneration is scheduled or running
 * - `taskSeq`: the sequence number of the latest scheduled task; only that task may run
 * - `scheduledFor`: when the latest task was scheduled to run
 *
 * @typedef {{ taskSeq: number; at: number }} Schedule
 * @typedef {{ taskSeq: number }} RegenTaskData
 */

/** @type {GardenRegenState} */
const EMPTY_STATE = { lastRegenAt: 0, changeSeq: 0, pending: false, taskSeq: 0, scheduledFor: 0 };

/** Admin-only debounce state document id, in the `system` collection */
const STATE_DOC_ID = 'garden-regen';
/** @returns {DocumentReference<GardenRegenState>} */
const getStateRef = () => systemDoc(STATE_DOC_ID);

/**
 * @param {Schedule} schedule
 */
async function enqueue({ taskSeq, at }) {
  // Deterministic id: if this trigger is retried after enqueueing, the duplicate is rejected.
  // Hashed, because sequential task names hurt Cloud Tasks performance.
  const id = createHash('sha256').update(`garden-regen-${taskSeq}`).digest('hex');
  const [resourceName, targetUri] = await getFunctionUrl(TASK_FUNCTION_NAME);
  /** @type {TaskQueue<RegenTaskData>} */
  const queue = getFunctions().taskQueue(resourceName);
  try {
    await queue.enqueue(
      { taskSeq },
      { id, scheduleTime: new Date(at), ...(targetUri ? { uri: targetUri } : {}) }
    );
  } catch (e) {
    if (/** @type {any} */ (e)?.code !== 'functions/task-already-exists') throw e;
  }
}

/**
 * Records a change, and schedules a regeneration if none is pending.
 * @returns {Promise<void>}
 */
async function scheduleRegeneration() {
  const ref = getStateRef();
  const schedule = await db.runTransaction(
    /** @returns {Promise<Schedule | null>} */
    async (tx) => {
      const now = Date.now();
      const s = (await tx.get(ref)).data() ?? EMPTY_STATE;
      const changeSeq = s.changeSeq + 1;
      const stale = s.pending && now > s.scheduledFor + STALE_MS;

      if (s.pending && !stale) {
        tx.set(ref, { ...s, changeSeq });
        // The scheduled or running regeneration covers this write
        return null;
      }
      if (stale) {
        logger.warn('Garden index regeneration task presumed lost, scheduling a new one', {
          taskSeq: s.taskSeq,
          scheduledFor: new Date(s.scheduledFor).toISOString()
        });
      }
      const next = {
        taskSeq: s.taskSeq + 1,
        // `now` = leading edge
        at: Math.max(now, s.lastRegenAt + windowMs())
      };
      tx.set(ref, {
        ...s,
        changeSeq,
        pending: true,
        taskSeq: next.taskSeq,
        scheduledFor: next.at
      });
      return next;
    }
  );
  if (schedule) await enqueue(schedule);
}

/**
 * Campsite write trigger: schedules a (debounced) regeneration of the listed gardens
 * file, but only if the write changed what's published in it.
 *
 * @param {FirestoreEvent<Change<DocumentSnapshot<Garden>>, { campsiteId: string }>} event
 */
exports.onCampsiteWriteRegenerateIndex = async ({ data, params }) => {
  const { beforeData, afterData } = changeData(data);
  if (!isPublicProjectionChanged(beforeData, afterData, params.campsiteId)) {
    return;
  }
  await scheduleRegeneration();
};

/**
 * Cloud Task handler that regenerates the listed gardens file.
 * Must run with `maxConcurrentDispatches: 1`.
 *
 * @param {import('firebase-functions/v2/tasks').Request<RegenTaskData>} req
 */
exports.regenerateGardenIndex = async (req) => {
  const { taskSeq } = req.data;
  const ref = getStateRef();

  // 1. Claim the run, and record its start as the new window start
  const claim = await db.runTransaction(async (tx) => {
    const s = (await tx.get(ref)).data();
    if (!s?.pending || s.taskSeq !== taskSeq) {
      // Stray or duplicate delivery, or superseded by stale recovery
      return null;
    }
    const now = Date.now();
    tx.update(ref, { lastRegenAt: now });
    return { seenSeq: s.changeSeq, startedAt: now };
  });
  if (!claim) {
    logger.info('Skipping a stale or duplicate garden index regeneration task', { taskSeq });
    return;
  }

  // 2. Regenerate from fresh Firestore data.
  // On failure, the task is retried (and claimed again) as per the retry config.
  await generateListedGardensFile();

  // 3. Were there writes during the regeneration? Then schedule the trailing run at the window end.
  const followUp = await db.runTransaction(
    /** @returns {Promise<Schedule | null>} */
    async (tx) => {
      const s = (await tx.get(ref)).data();
      if (!s || s.taskSeq !== taskSeq) {
        // Stale recovery took over
        return null;
      }
      if (s.changeSeq === claim.seenSeq) {
        tx.update(ref, { pending: false });
        return null;
      }
      const next = { taskSeq: s.taskSeq + 1, at: claim.startedAt + windowMs() };
      tx.update(ref, { taskSeq: next.taskSeq, scheduledFor: next.at });
      return next;
    }
  );
  if (followUp) await enqueue(followUp);
};

exports.GARDEN_REGEN_STATE_DOC_ID = STATE_DOC_ID;
exports.scheduleRegeneration = scheduleRegeneration;
