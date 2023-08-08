import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { type Firestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { initializeEuropeWest1Functions, initializeUsCentral1Functions } from './functions';
import envIsTrue from '../util/env-is-true';

const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string
};

const messageFor = (str: string) => `Trying to use an uninitialized ${str}.`;
type FirestoreWarning = {
  app: string;
  firestore: string;
  auth: string;
  storage: string;
  functions: string;
};
export const FIREBASE_WARNING: FirestoreWarning = [
  'app',
  'firestore',
  'auth',
  'storage',
  'functions'
].reduce(
  (warningsObj, service) => ({ ...warningsObj, [service]: messageFor(service) }),
  {}
) as FirestoreWarning;

/**
 * Helper function to provide access to a Firebase service with strong TypeScript typing.
 * @param accessRef an accessor function for the Firebase service.
 *        Should return null if the service is not yet initialized.
 * @throws in case the service is called when it is not yet initiazed.
 */
export const guardNull = <T>(
  accessRef: () => T | null,
  type: keyof FirestoreWarning
): (() => T) => {
  return () => {
    const ref = accessRef();
    if (ref) {
      return ref;
    }
    throw new Error(FIREBASE_WARNING[type]);
  };
};

// Throw warnings when trying to access uninitialized services.
let appRef: FirebaseApp | null = null;
export const app: () => FirebaseApp = guardNull<FirebaseApp>(() => appRef, 'app');

let dbRef: Firestore | null = null;
export const db: () => Firestore = guardNull<Firestore>(() => dbRef, 'firestore');

let authRef: Auth | null = null;
export const auth: () => Auth = guardNull<Auth>(() => authRef, 'auth');

let usCentral1FunctionsRef: Functions | null = null;
export const functions: () => Functions = guardNull<Functions>(
  () => usCentral1FunctionsRef,
  'functions'
);

let europeWest1FunctionsRef: Functions | null = null;
export const europeWest1Functions: () => Functions = guardNull<Functions>(
  () => europeWest1FunctionsRef,
  'functions'
);

let storageRef: FirebaseStorage | null = null;
export const storage: () => FirebaseStorage = guardNull<FirebaseStorage>(
  () => storageRef,
  'storage'
);

// TODO: window may not be available on server-side SvelteKit
const isRunningLocally = window && window.location.hostname.match('localhost|127.0.0.1');

const shouldUseEmulator = (specificEmulatorOverride?: boolean | undefined | null) =>
  // If an override is defined, only look at that value.
  // Otherwise, look at the generic ALL_EMULATORS setting.
  isRunningLocally &&
  (specificEmulatorOverride ?? envIsTrue(import.meta.env.VITE_USE_ALL_EMULATORS) ?? false);

export async function initialize(): Promise<void> {
  if (getApps().length !== 0) {
    console.log('Firebase app already initialized');
    return;
  }
  appRef = initializeApp(FIREBASE_CONFIG);

  if (typeof import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN !== 'undefined') {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
      import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
  }

  if (typeof import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY !== 'undefined') {
    initializeAppCheck(appRef, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY),
      isTokenAutoRefreshEnabled: true
    });
  }

  dbRef = getFirestore(appRef);
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_FIRESTORE_EMULATOR))) {
    connectFirestoreEmulator(dbRef, 'localhost', 8080);
  }

  authRef = getAuth(appRef);
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_AUTH_EMULATOR))) {
    connectAuthEmulator(authRef, 'http://localhost:9099');
  }

  storageRef = getStorage(appRef);
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_STORAGE_EMULATOR))) {
    connectStorageEmulator(storageRef, 'localhost', 9199);
  }

  // The default functions ref is us-central1
  usCentral1FunctionsRef = getFunctions(appRef, 'us-central1');
  initializeUsCentral1Functions(usCentral1FunctionsRef);
  // Surprise surprise, we need to explicitly create a new Functions
  // instance for any functions hosted on europe-west1
  // https://firebase.google.com/docs/functions/beta/callable#initialize_the_client_sdk
  europeWest1FunctionsRef = getFunctions(appRef, 'europe-west1');
  initializeEuropeWest1Functions(europeWest1FunctionsRef);

  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_API_EMULATOR))) {
    connectFunctionsEmulator(usCentral1FunctionsRef, 'localhost', 5001);
    connectFunctionsEmulator(europeWest1FunctionsRef, 'localhost', 5001);
  }
  authRef.useDeviceLanguage();
}
