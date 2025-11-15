/**
 * To detect specific bot-generated fake field values we've observed
 * in fake account creations.
 *
 * Heuristics:
 * - Reject null/empty
 * - Only A–Z/a–z, length 4..128
 * - Must contain both uppercase and lowercase
 * - At least 4 case alternations (e.g. "Aa" or "aA" occurrences)
 * - Upper/lowercase ratio between (1/4) and (8/1)
 *
 * Weak points: FirstAndLastName is considered random
 *
 * @param {string | null | undefined} s
 * @returns {boolean}
 */
module.exports = function isRandomMixedCase(s) {
  if (!s || typeof s !== 'string') return false;
  if (s.length < 4 || s.length > 128) return false;
  if (!/^[A-Za-z]{4,128}$/.test(s)) return false;
  // Must contain at least 1 upper and 1 lowercase
  if (!/[A-Z]/.test(s) || !/[a-z]/.test(s)) return false;

  // Note: each match consumes the string to match still so 'eAe' only results in
  // the single match eA, not in the matches 'eA' and 'Ae'. So this underreports.
  const alternations = (s.match(/([A-Z][a-z]|[a-z][A-Z])/g) || []).length;
  if (alternations < 4) return false;

  const upperCount = (s.match(/[A-Z]/g) || []).length;
  const lowerCount = (s.match(/[a-z]/g) || []).length;
  if (lowerCount === 0) return false;

  const ratio = upperCount / lowerCount;
  if (ratio < 0.25 || ratio > 8) return false;

  return true;
};
