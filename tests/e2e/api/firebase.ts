import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const app = initializeApp({
  ...(process.env.USE_DEMO_PROJECT === 'true'
    ? { projectId: 'demo-test' }
    : { credential: applicationDefault() })
});

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
  ? storage.bucket(process.env.FIREBASE_STORAGE_BUCKET)
  : null;

export { app, auth, storage, storageBucket, db };
