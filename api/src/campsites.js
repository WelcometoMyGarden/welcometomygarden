// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

exports.onCampsiteCreate = async () => {
  await db
    .collection('stats')
    .doc('campsites')
    .update({ count: FieldValue.increment(1) });
};

exports.onCampsiteDelete = async () => {
  await db
    .collection('stats')
    .doc('campsites')
    .update({ count: FieldValue.increment(-1) });
};
