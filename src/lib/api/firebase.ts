import { getAuth, type Auth } from 'firebase/auth';
import { type Firestore, getFirestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getFunctions, type Functions } from 'firebase/functions';
import { initializeFunctions } from './functions';

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


const messageFor = (str: string) => `Trying to use an uninitialized ${str}.`;
type FirestoreWarning = { 'app': string, 'firestore': string, 'auth': string, 'storage': string, 'functions': string, 'analytics': string, 'performance': string };
export const FIREBASE_WARNING: FirestoreWarning =
  ['app', 'firestore', 'auth', 'storage', 'functions']
    .reduce((warningsObj, service) => ({ ...warningsObj, [service]: messageFor(service) }), {}) as FirestoreWarning

/**
 * Helper function to provide access to a Firebase service with strong TypeScript typing.
 * @param accessRef an accessor function for the Firebase service.
 *        Should return null if the service is not yet initialized.
 * @throws in case the service is called when it is not yet initiazed.
 */
export const guardNull = <T>(accessRef: () => T | null, type: keyof FirestoreWarning): (() => T) => {
  return () => {
    const ref = accessRef();
    if (ref) {
      return ref;
    }
    throw new Error(FIREBASE_WARNING[type])
  }
}

// Throw warnings when trying to access uninitialized services.
let appRef: FirebaseApp | null = null;
export const app: () => FirebaseApp = guardNull<FirebaseApp>(() => appRef, 'app');

let dbRef: Firestore | null = null;
export const db: () => Firestore = guardNull<Firestore>(() => dbRef, 'firestore');

let authRef: Auth | null = null;
export const auth: () => Auth = guardNull<Auth>(() => authRef, 'auth')

let functionsRef: Functions | null = null;
export const functions: () => Functions = guardNull<Functions>(() => functionsRef, 'functions')

let storageRef: FirebaseStorage | null = null;
export const storage: () => FirebaseStorage = guardNull<FirebaseStorage>(() => storageRef, 'storage')

let analyticsRef: Analytics | null = null;
export const analytics: () => Analytics = guardNull<Analytics>(() => analyticsRef, 'analytics')

let performanceRef: FirebasePerformance | null = null;
export const performance: () => FirebasePerformance = guardNull<FirebasePerformance>(() => performanceRef, 'performance')

export async function initialize(): Promise<void> {
  if (getApps().length !== 0) {
    console.log('Firebase app already initialized');
    return;
  }
  appRef = initializeApp(FIREBASE_CONFIG);
  dbRef = getFirestore(appRef);
  authRef = getAuth(appRef);
  storageRef = getStorage(appRef);
  functionsRef = getFunctions(appRef);
  initializeFunctions(functionsRef);
  authRef.useDeviceLanguage();

  if (import.meta.env.PROD) addMetrics();
}


const addMetrics = async () => {
  analyticsRef = getAnalytics(app());
  performanceRef = getPerformance(app());
};


// TODO: Add emulator support :
/*
if (window && window.location.hostname === 'localhost' && import.meta.env.VITE_USE_API_EMULATOR) {
  functions.useFunctionsEmulator('http://localhost:5001');
}
 */
