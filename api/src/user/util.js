// @ts-check
/**
 * @param {string} name
 * @returns {string}
 */
exports.normalizeName = (name) => {
  const normalized = name.trim().toLowerCase();
  // TODO should we remove diacritics? Probably not...
  //
  // Capitalize the name if the first character is a regex \w string
  return normalized.replace(/\b(\w)/g, (s) => s.toUpperCase());
};

/**
 * @param {string} firstName
 * @returns {boolean}
 */
exports.isValidFirstName = (firstName) => firstName.length > 0 && firstName.length <= 25;

/**
 * @param {string} lastName
 * @returns {boolean}
 */
exports.isValidLastName = (lastName) => lastName.length > 0 && lastName.length <= 50;
