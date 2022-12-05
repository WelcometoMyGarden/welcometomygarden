const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const db = getFirestore()

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
