import { getAuth, type Auth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getFunctions, type Functions } from 'firebase/functions';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

if (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) FIREBASE_CONFIG.measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string;


export let app: FirebaseApp = null;
export let db: Firestore = null;
export let auth: Auth = null;
export let functions: Functions = null;
export let storage: FirebaseStorage = null;

export let analytics: Analytics = null;
export let performance: FirebasePerformance = null;

export async function initialize(): Promise<void> {
  if (getApps().length !== 0) {
    console.log('Firebase app already initialized');
    return;
  }
  app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  auth.useDeviceLanguage();

  if (import.meta.env.PROD) addMetrics();
}

const addMetrics = async () => {
  analytics = getAnalytics(app);
  performance = getPerformance(app);
};


// TODO: Add emulator support :
/*
if (window && window.location.hostname === 'localhost' && import.meta.env.VITE_USE_API_EMULATOR) {
  functions.useFunctionsEmulator('http://localhost:5001');
}
 */
