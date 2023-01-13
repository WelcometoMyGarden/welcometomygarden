/**
 * Removes the ending slash of a string, if it has one.
 * @param {string} str
 */
module.exports = (str) => {
  if (str.endsWith('/')) {
    return str.substring(0, str.length - 1);
  }
  return `${str}`;
};
