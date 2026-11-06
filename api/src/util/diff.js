// Inspired on Firebase .diff().affectedKeys()
const lodash = require('lodash');
const { toPairs, xorWith, isEqual, uniq, isPlainObject, difference } = lodash;

/**
 * The top-level keys that differ between two objects.
 *
 * Mirrors Firestore rules' `request.resource.data.diff(resource.data).affectedKeys()`,
 * which likewise only reports *top-level* field names. Use `affectedPaths` when you
 * need to know which nested field inside a map changed.
 *
 * @param {Record<string, any> | null | undefined} obj1
 * @param {Record<string, any> | null | undefined} obj2
 * @returns {string[]}
 */
exports.affectedKeys = function (obj1, obj2) {
  const [pairs1, pairs2] = [obj1, obj2].map(toPairs);
  // difference: what is in <first> that is not in <second>
  // xor: what is in <first> that is not in <second>, union with what is in <second> that is not in <first>
  const diff = xorWith(pairs1, pairs2, isEqual);
  // changed values will be twice in the xor set since both their old and new value are not common
  // -> mention them once with uniq
  return uniq(diff.map(([key]) => key));
};

/**
 * Like `affectedKeys`, but it descends into nested maps and reports dot-separated
 * paths to the changed *leaves*, the same notation Firestore `update()` calls use
 * (`'emailPreferences.newChat'`).
 *
 * Only plain objects are descended into, so Firestore values that happen to be class
 * instances (`Timestamp`, `GeoPoint`, `DocumentReference`) and arrays are compared as
 * a whole (if lodash isEqual reports them not equal, they are reported under their own
 * path).
 *
 * If a map is added or removed entirely, its own path is reported (not the paths of
 * each of its leaves).
 *
 * @param {Record<string, any> | null | undefined} before
 * @param {Record<string, any> | null | undefined} after
 * @param {string} [prefix] used internally while recursing
 * @returns {string[]}
 */
const affectedPaths = function (before, after, prefix = '') {
  const keys = uniq([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return keys.flatMap((key) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const beforeValue = (before ?? {})[key];
    const afterValue = (after ?? {})[key];
    if (isEqual(beforeValue, afterValue)) {
      return [];
    }
    if (isPlainObject(beforeValue) && isPlainObject(afterValue)) {
      return affectedPaths(beforeValue, afterValue, path);
    }
    return [path];
  });
};
exports.affectedPaths = affectedPaths;

/**
 * Whether a change touches *something*, and nothing outside of `allowedPaths`.
 *
 * Meant to short-circuit snapshot listeners that only care about some fields:
 * `onlyAffects(before, after, ['emailPreferences.newChat'])`.
 *
 * Note that a write which changed nothing at all returns `false` — "no change" is not
 * the same as "only this change", and callers generally want no-op writes to keep
 * following their normal path.
 *
 * @param {Record<string, any> | null | undefined} before
 * @param {Record<string, any> | null | undefined} after
 * @param {string[]} allowedPaths dot-separated, as returned by `affectedPaths`
 * @returns {boolean}
 */
exports.onlyAffects = function (before, after, allowedPaths) {
  const changedPaths = affectedPaths(before, after);
  return changedPaths.length > 0 && difference(changedPaths, allowedPaths).length === 0;
};
