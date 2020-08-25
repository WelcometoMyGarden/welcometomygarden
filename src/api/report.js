import { db, Timestamp } from './index';

export default async (report) => {
  report.createdAt = Timestamp.now();
  await db.collection('reports').add(report);
};

export const findAll = async () => {
  const snapshot = await db.collection('reports').get();
  return snapshot.docs.map((report) => report.data());
};
