const { logger } = require('firebase-functions');
// eslint-disable-next-line import/no-unresolved
const { Timestamp } = require('firebase-admin/firestore');
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
 * Mapper that converts Firebase timestamps to ISO date strings
 * @returns {[string, any]}
 */
exports.simpleTimeMapper = ([key, value]) => {
  if (value instanceof Timestamp) {
    return [key, value.toDate().toISOString()];
  }
  return [key, value];
};

/**
 * @param {(([key, value]) => [string, any] | [string, any][] | null)} mapper
 * @param pick
 * @returns
 */
const createDataMapper = (mapper, pick) => (data) =>
  Object.fromEntries(
    Object.entries(data)
      .map((d) => {
        const [key] = d;
        // Omit non-picked values when pick is specified
        if (pick && Array.isArray(pick) && !pick.includes(key)) {
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
 * @prop {Record<string, any>} [extraProps] extra props to add to the inserted document
 * @prop {string[]} [pick] subset of Firestore document properties to preserve
 * @prop {string[][]} [extraDeletionFilters] extra filters that should be applied for deletion changes, when the `id` column alone does not
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
    if (after.exists) {
      changeType = 'upsert';
      result = await supabase
        .from(tableName)
        .upsert({
          id: after.id,
          ...createDataMapper(dataMapper, pick)(after.data()),
          ...extraProps
        })
        .select();
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
    }
    if (result.error) {
      logger.warn(
        `Error while replicating ${changeType} in ${tableName}\n:`,
        result,
        '\nData:\n',
        before.data(),
        after.data()
      );
    } else if (result.data) {
      logger.debug(`Replicated change in ${tableName}`, result.data);
    }
  } catch (e) {
    logger.warn(`Caught error while replicating change in ${tableName}`, e);
  }
};
