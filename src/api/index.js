import fire from 'firebase/app';
import 'firebase/firestore';
import 'firebase/functions';
import 'firebase/storage';
import 'firebase/auth';

import { config } from '@/config';

const firebaseConfig = {
  apiKey: config.FIREBASE_API_KEY,
  authDomain: config.FIREBASE_AUTH_DOMAIN,
  databaseURL: config.FIREBASE_DATABASE_URL,
  projectId: config.FIREBASE_PROJECT_ID,
  storageBucket: config.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
  appId: config.FIREBASE_APP_ID
};

if (config.FIREBASE_MEASUREMENT_ID) firebaseConfig.measurementId = config.FIREBASE_MEASUREMENT_ID;

const firebase = fire.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
export const functions = firebase.functions();
export const storage = firebase.storage().ref();

export const Timestamp = fire.firestore.Timestamp;

auth.useDeviceLanguage();

if (window.location.hostname === 'localhost' && config.USE_API_EMULATOR) {
  functions.useFunctionsEmulator('http://localhost:5001');
}

const addMetrics = async () => {
  await import('firebase/analytics');
  await import('firebase/performance');
  firebase.analytics();
  firebase.performance();
};

if (NODE_ENV === 'production') addMetrics();

export default firebase;
