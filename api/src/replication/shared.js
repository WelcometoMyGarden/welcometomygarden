const { logger } = require('firebase-functions');
const { Timestamp } = require('firebase-admin/firestore');
const _ = require('lodash');
const { supabase } = require('../supabase');
const { wait } = require('../util/time');

/**
 * A concrete Firestore document-write trigger handler: it receives an event for
 * a specific document model `T` and the path wildcard params `P`.
 *
 * @template {DocumentData} T
 * @template {Record<string, string>} P
 * @typedef {(event: FirestoreEvent<Change<DocumentSnapshot<T>>, P>) => any} WriteHandler
 */

/**
 * Runs the given write-trigger handlers concurrently against a single event.
 *
 * Completes work in other handlers if any handler fails, but also rejects if any handler fails.
 *
 * @template {DocumentData} T
 * @template {Record<string, string>} P
 * @param {WriteHandler<T, P>[]} handlers
 * @returns {(event: FirestoreEvent<Change<DocumentSnapshot> | undefined, P>) => Promise<any>} makes this writable to Firestore event handler registrars
 */
exports.executeFirestoreTriggersConcurrently = (handlers) => async (event) => {
  const typedEvent = /** @type {FirestoreEvent<Change<DocumentSnapshot<T>>, P>} */ (event);
  return Promise.allSettled(handlers.map((handler) => handler(typedEvent))).then((statuses) => {
    if (statuses.some(({ status }) => status === 'rejected')) {
      throw 'One or more concurrent handlers failed';
    } else {
      return Promise.resolve('All concurrent handlers fulfilled');
    }
  });
};

/**
 * Runs the given write-trigger handlers serially against a single event.
 * Same widening/cast rationale as {@link executeFirestoreTriggersConcurrently}.
 * @template {DocumentData} T
 * @template {Record<string, string>} P
 * @param {WriteHandler<T, P>[]} handlers
 * @returns {(event: FirestoreEvent<Change<DocumentSnapshot> | undefined, P>) => Promise<any>}
 */
exports.seralizeFirestoreTriggers = (handlers) => async (event) => {
  const typedEvent = /** @type {FirestoreEvent<Change<DocumentSnapshot<T>>, P>} */ (event);
  for (const handler of handlers) {
    await handler(typedEvent);
  }
};

/**
 * Cast Firestore trigger handlers to (event: any) => any.
 *
 * This does nothing (identity) at runtime; the cast exists only to satisfy
 * `strictFunctionTypes`.
 *
 * This example shows why:
 *
 * ```js
 * // onCampsiteCreate is annotated to take only:
 * //   FirestoreEvent<QueryDocumentSnapshot<Garden>, { campsiteId: string }>
 * // onDocumentCreated insists on a handler taking:
 * //   FirestoreEvent<QueryDocumentSnapshot<DocumentData>, Record<string, string>>
 *
 * onDocumentCreated('campsites/{campsiteId}', onCampsiteCreate);
 * //                                          ^ TS2769: No overload matches this call
 *
 * onDocumentCreated('campsites/{campsiteId}', widenTrigger(onCampsiteCreate)); // ok
 * ```
 *
 * `campsites/{campsiteId}` only ever yields gardens, so the widening is sound,
 * and the handler stays fully type-checked at its own definition.
 * @param {(event: any) => any} handler
 * @returns {(event: any) => any}
 */
exports.widenTrigger = (handler) => handler;

/**
 * Only call the function if the guard is true, otherwise do nothing
 * @type {WrappedFunction}
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
  ..._.pick(user, 'email', 'emailVerified', 'disabled'),
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
      .reduce(
        (acc, e) => (Array.isArray(e[0]) ? [...acc, ...e] : [...acc, e]),
        /** @type {any[]} */ ([])
      )
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
   * `after.data()` comes from the Firebase Admin SDK, so this is the
   * `@google-cloud/firestore` `DocumentData` (the api-wide global type), not the
   * `firebase/firestore` client type — that package is a frontend-only dep and
   * isn't installed for the api typecheck.
   * @type {null | ({id: string} & DocumentData)}
   */
  let afterDocWithData = null;
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
      // If an `after` exists, we've received either an update or insert from Firebase.
      // This translates to an upsert in Supabase.
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
