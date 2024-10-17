const { logger } = require('firebase-functions');
const { Timestamp } = require('firebase-admin/firestore');
const _ = require('lodash');
const { supabase } = require('../supabase');
const { wait } = require('../util/time');

/**
 * Note: I'd prefer the path to be Record<string,string>, but it seems like
 * TS needs a combination of all possible params here to not complain.
 * Typescript gives errors for the one case (onUserPrivateWrite) where the parameters type is given.
 *
 * @typedef {<T extends Change<DocumentSnapshot<any>>>
 *  (event: FirestoreEvent<T, {userId: string; campsiteId: string;}>) => Promise<any>} FirestoreEventHandler
 */

/**
 * @type {(handlers: FirestoreEventHandler[]) => FirestoreEventHandler}
 */
exports.executeFirestoreTriggersConcurrently = (handlers) => async (event) =>
  Promise.allSettled(handlers.map((handler) => handler(event)));

/**
 * @type {(handlers: FirestoreEventHandler[]) => FirestoreEventHandler}
 */
exports.seralizeFirestoreTriggers = (handlers) => async (event) => {
  for (const handler of handlers) {
    // eslint-ignore
    await handler(event);
  }
};

/**
 * Only call the function if the guard is true, otherwise do nothing
 * @type {WrappedFunction}
}
 */
exports.guardOn = function wrappedFunc(guard, func) {
  return (...args) => {
    if (guard) {
      return func(...args);
    }
    return null;
  };
};

/**
 * @param {Timestamp} [t]
 * @returns {string | null}
 */
const timestampToISOString = (t) => {
  if (t) {
    return t.toDate().toISOString();
  }
  return null;
};

/**
 * Mapper that converts Firebase timestamps to ISO date strings
 * @returns {[string, any]}
 */
exports.simpleTimeMapper = ([key, value]) => {
  if (value instanceof Timestamp) {
    return [key, timestampToISOString(value)];
  }
  return [key, value];
};

const convertDate = (utcString) =>
  utcString != null ? new Date(utcString).toISOString() : undefined;

/**
 * Maps auth user to its Postgres representation
 * @param {import("firebase-admin/auth").UserRecord} user
 */
exports.mapAuthUser = (user) => ({
  id: user.uid,
  ..._.pick(user, 'email', 'emailVerified'),
  name: user.displayName,
  userCreationTime: convertDate(user.metadata.creationTime),
  lastSignInTime: convertDate(user.metadata.lastSignInTime),
  // Likely undefined on creation, at least in the emulator
  lastRefreshTime: convertDate(user.metadata.lastRefreshTime)
});

/**
 * Creates a mapper that will convert a Firebase data record into a record suitable for a corresponding SQL table.
 *
 * @param {(([key, value]) => [string, any] | [string, any][] | null)} mapper
 *    This mapper will receive the the raw .data() of a Firebase document, with the internal createTime and updateTime as a base, as key-value pairs.
 *    - Returning a falsy value will omit the key-value pair from the final object
 *    - A single key value pair can be mapped onto another key-value pair, for example to rename the
 *    - A single key value pair can be mapped onto multiple key-value pairs, which will be flattened in the final object.
 * @param {string[]} [pick] a subset of keys to consider from the original Firebase record.
 *      Note that createTime and updateTime are by default NOT picked, and must be included in this array for them to end up
 *      in the final object.
 * @returns
 */
const createDataMapper = (mapper, pick) => (data) =>
  Object.fromEntries(
    Object.entries(data)
      .map((d) => {
        const [key] = d;
        if (
          // Omit non-picked values when pick is specified
          (pick && Array.isArray(pick) && !pick.includes(key)) ||
          // Always exclude createTime and updateTime when they are not explicitly picked
          (!pick && (key === 'createTime' || key === 'updateTime'))
        ) {
          return null;
        }
        return mapper(this.simpleTimeMapper(d));
      })
      .filter((v) => !!v)
      // flatten double-nested arrays, but leave single-nested arrays
      .reduce((acc, e) => (Array.isArray(e[0]) ? [...acc, ...e] : [...acc, e]), [])
  );

exports.createDataMapper = createDataMapper;

/**
 * @typedef {Object} ReplicateOptions
 * @prop {import("firebase-functions").Change<import("@google-cloud/firestore").DocumentSnapshot>} change
 * @prop {string} tableName the target table name in Supabase
 * @prop {(([key, value]) => [string, any] | [string, any][])} [dataMapper] mapper to map the KV pairs of the source Firestore document,
 *  it should return a (collection of) equivalent KV pairs compatible with the schema of the Supabase db.
 * @prop {Record<string, any>} [extraProps] extra contextual props to add to the inserted document. These are not passed to the mapper, and do not have to be picked. They will overwrite mapped data.
 * @prop {string[]} [pick] subset of Firestore document properties to preserve.
 *  Does not have to include 'id', since that is taken automatically from the Firebase document ID.
 *  Must be supplied with values for createTime and updateTime if these internal Firebase properties should be be synced with the SQL table
 * @prop {string[][]} [extraDeletionFilters] extra identifying conditions that should be applied for deletion changes, when the `id` column alone does not
 *  uniquely represent the (composite) primary key of the table. These extra filters should "fill in" the primary key.
 */

const MAX_ATTEMPTS = 7;

/**
 * @param {(attempt: number) => Promise<boolean>} fn
 * @param {number} attempt
 * @returns {Promise<boolean>}
 */
const callWithRetries = async (fn, attempt = 1) => {
  const success = await fn(attempt);
  if (success) {
    return success;
  }
  // Run this in a REPL to play with exponential backoff parameters:
  // {
  //   const progression = Array(7)
  //     .fill(0)
  //     .map((_, i) => 3 ** (i + 1) * 10);
  //   console.log(progression.map((n,i) => `${i+1}. ${n}ms`));
  //   const total = progression.reduce((acc, e, i) => acc + e, 0);
  //   console.log(total/1000)
  // }
  if (attempt < MAX_ATTEMPTS) {
    await wait(3 ** attempt * 10);

    return callWithRetries(fn, attempt + 1);
  }
  // all failed
  return false;
};

/**
 * @param {ReplicateOptions} options
 */
exports.replicate = async (options) => {
  const {
    change,
    tableName,
    dataMapper = (v) => v,
    extraProps = {},
    pick,
    extraDeletionFilters = []
  } = options;

  // Default firebase function max runtime is 60 seconds; we want ~max. 30 seconds of retries.

  const { before, after } = change;
  let changeType;
  /**
   * @type {undefined | {id: string} & import('firebase/firestore').DocumentData}
   */
  let afterDocWithData;
  if (after.exists) {
    changeType = 'upsert';
    afterDocWithData = { id: after.id, ...after.data() };
  } else if (before.exists && !after.exists) {
    // If `before` exists and `after` not, a deletion happened
    changeType = 'deletion';
  }
  const isUpdate = before.exists && after.exists;

  /**
   * @param {number} attempt
   * @returns {Promise<boolean>} true on success, false on error
   */
  async function attemptReplication(attempt) {
    try {
      // If an `after` exists, it's either an update or insert
      let result;
      if (changeType === 'upsert') {
        result = await supabase()
          .from(tableName)
          .upsert({
            id: after.id,
            ...createDataMapper(
              dataMapper,
              pick
            )({
              ..._.mapValues(_.pick(after, 'createTime', 'updateTime'), timestampToISOString),
              ...after.data()
            }),
            ...extraProps
          });

        if (!result.error) {
          // success
          logger.debug(
            `Replicated ${isUpdate ? 'update' : 'creation'} in ${tableName} on attempt ${attempt}`,
            afterDocWithData
          );
          return true;
        }
      } else if (changeType === 'deletion') {
        let query = supabase().from(tableName).delete().eq('id', before.id);
        if (extraDeletionFilters.length > 0) {
          for (let i = 0; i < extraDeletionFilters.length; i += 1) {
            const filterPair = extraDeletionFilters[i];
            query = query.eq.call(query, ...filterPair);
          }
        }
        result = await query;
        if (!result.error) {
          // success
          logger.debug(
            `Replicated deletion in ${tableName} on attempt ${attempt}`,
            afterDocWithData
          );
          return true;
        }
      }
      if (result.error) {
        logger.warn(
          `Error while replicating ${changeType} in ${tableName} on attempt ${attempt}\n:`,
          result,
          '\nData:\n',
          before.data(),
          afterDocWithData
        );
        return false;
      }
      // We shouldn't reach here, but just in case
      return true;
    } catch (e) {
      // Note: this doesn't seem to happen, it looks like the Supabase client catches all network errors.
      logger.warn(`Caught error while replicating change in ${tableName}`, e);
      return false;
    }
  }
  const result = await callWithRetries(attemptReplication);
  if (!result) {
    logger.error(`All attempts failed while replicating ${changeType} in ${tableName}`);
  }
  return result;
};
