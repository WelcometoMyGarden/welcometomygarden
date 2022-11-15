import fire from 'firebase/app';
import 'firebase/firestore';
import 'firebase/functions';
import 'firebase/storage';
import 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID)
  firebaseConfig.measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

const firebase = fire.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
export const functions = firebase.functions();
export const storage = firebase.storage().ref();

export const Timestamp = fire.firestore.Timestamp;

auth.useDeviceLanguage();

if (window.location.hostname === 'localhost' && import.meta.env.VITE_USE_API_EMULATOR) {
  functions.useFunctionsEmulator('http://localhost:5001');
}

const addMetrics = async () => {
  await import('firebase/analytics');
  await import('firebase/performance');
  firebase.analytics();
  firebase.performance();
};

if (import.meta.env.PROD) addMetrics();

export default firebase;
