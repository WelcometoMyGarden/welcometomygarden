// Maybe later, add ignoreUndefinedProperties instead https://stackoverflow.com/a/69014771/4973029
// https://stackoverflow.com/questions/69014671/firebase-firestore-v9-best-practices-ignoreundefinedproperties-vs-conditional

module.exports = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
