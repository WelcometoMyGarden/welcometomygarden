import { DocumentReference, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { STATS } from './collections';

type CountStat = { count: number };

export const getSuperfanCount = async () => {
  return (await getDoc(doc(db(), STATS, 'superfans') as DocumentReference<CountStat>)).data()
    ?.count;
};
