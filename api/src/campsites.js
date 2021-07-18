const admin = require('firebase-admin');

exports.onCampsiteCreate = async () => {
  const db = admin.firestore();
  await db
    .collection('stats')
    .doc('campsites')
    .update({ count: admin.firestore.FieldValue.increment(1) });
};

exports.onCampsiteDelete = async () => {
  const db = admin.firestore();
  await db
    .collection('stats')
    .doc('campsites')
    .update({ count: admin.firestore.FieldValue.increment(-1) });
};
