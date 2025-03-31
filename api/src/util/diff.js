// Inspired on Firebase .diff().affectedKeys()
const lodash = require('lodash');
const { toPairs, xorWith, isEqual, uniq } = lodash;

exports.affectedKeys = function (obj1, obj2) {
  const [pairs1, pairs2] = [obj1, obj2].map(toPairs);
  // difference: what is in <first> that is not in <second>
  // xor: what is in <first> that is not in <second>, union with what is in <second> that is not in <first>
  const diff = xorWith(pairs1, pairs2, isEqual);
  // changed values will be twice in the xor set since both their old and new value are not common
  // -> mention them once with uniq
  return uniq(diff.map(([key]) => key));
};
