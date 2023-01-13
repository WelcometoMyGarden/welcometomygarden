// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();

exports.onCampsiteCreate = async () => {
  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(1) }, { merge: true });
};

exports.onCampsiteDelete = async () => {
  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(-1) }, { merge: true });
};
