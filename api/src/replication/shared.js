const { logger } = require('firebase-functions');
// eslint-disable-next-line import/no-unresolved
const { Timestamp } = require('firebase-admin/firestore');
const _ = require('lodash');
const supabase = require('../supabase');

/**
 * @typedef {(change: import("firebase-functions").Change<any>, context: import('firebase-functions').EventContext<any>) => Promise<any>} handler
 */

exports.multiplexFirestoreTrigger = (handlers) =>
  /**
  @type {handler}
   */ (
    async (change, context) =>
      Promise.allSettled(handlers.map((handler) => handler(change, context)))
  );

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
  const { before, after } = change;
  try {
    // If an `after` exists, it's either an update or insert
    let result;
    let changeType;
    const isUpdate = before.exists && after.exists;
    if (after.exists) {
      changeType = 'upsert';
      result = await supabase
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
        })
        .select();
      logger.debug(`Replicated ${isUpdate ? 'update' : 'creation'}  in ${tableName}`, result.data);
    } else if (before.exists && !after.exists) {
      // If `before` exists and `after` not, a deletion happened
      changeType = 'deletion';
      let query = supabase.from(tableName).delete().eq('id', before.id);
      if (extraDeletionFilters.length > 0) {
        for (let i = 0; i < extraDeletionFilters.length; i += 1) {
          const filterPair = extraDeletionFilters[i];
          query = query.eq.call(query, ...filterPair);
        }
      }
      result = await query;
      logger.debug(`Replicated deletion in ${tableName}`, result.data);
    }
    if (result.error) {
      logger.warn(
        `Error while replicating ${changeType} in ${tableName}\n:`,
        result,
        '\nData:\n',
        before.data(),
        after.data()
      );
    }
  } catch (e) {
    logger.warn(`Caught error while replicating change in ${tableName}`, e);
  }
};
