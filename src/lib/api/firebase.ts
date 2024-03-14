import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { type Firestore, getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { initializeEuropeWest1Functions, initializeUsCentral1Functions } from './functions';
import {
  getMessaging,
  isSupported as isWebPushSupported,
  onMessage,
  type Messaging
} from 'firebase/messaging';
import envIsTrue from '../util/env-is-true';
import { browser } from '$app/environment';

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

const firestoreWarningKeys = [
  'app',
  'firestore',
  'auth',
  'storage',
  'functions',
  'messaging',
  'appCheck'
] as const;
type FirestoreWarning = { [key in (typeof firestoreWarningKeys)[number]]: string };

export const FIREBASE_WARNING: FirestoreWarning = firestoreWarningKeys.reduce(
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

// Experimental: connect to a locally modified Firebase SDK client with support to connect to
// HTTPS emulators. Hasn't worked so far.
const SSL_DEV = false;

// Throw warnings when trying to access uninitialized services.
let appRef: FirebaseApp | null = null;
export const app: () => FirebaseApp = guardNull<FirebaseApp>(() => appRef, 'app');

let dbRef: Firestore | null = null;
export const db: () => Firestore = guardNull<Firestore>(() => dbRef, 'firestore');

let authRef: Auth | null = null;
export const auth: () => Auth = guardNull<Auth>(() => authRef, 'auth');

let appCheckRef: AppCheck | null = null;
export const appCheck: () => AppCheck = guardNull<AppCheck>(() => appCheckRef, 'appCheck');

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

// TODO: configure via env var?
// Note: can be changed to an internal IP
// Warnng: setting to another setting than 'localhost' has implications on the testability of services.
// - Service Workers (web push) only work on localhost OR HTTPS
// - Firebase Emulators CAN'T USE HTTPS
//   https://github.com/firebase/firebase-tools/issues/1908#issuecomment-1677219899
// - Requests will fail if HTTPS hosting is configured for Sveltekit, and it tries to fetch HTTP content from Firebase Emulators.
const emulatorHostName = browser ? window.location.hostname : 'localhost';

let messagingRef: Messaging;
export const messaging: () => Messaging = guardNull<Messaging>(() => messagingRef, 'messaging');

// TODO: window may not be available on server-side SvelteKit
const isRunningLocally = window && window.location.hostname.match(`${emulatorHostName}|127.0.0.1`);

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
    appCheckRef = initializeAppCheck(appRef, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY),
      isTokenAutoRefreshEnabled: true
    });
  }

  dbRef = getFirestore(appRef);
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_FIRESTORE_EMULATOR))) {
    connectFirestoreEmulator(dbRef, emulatorHostName, SSL_DEV ? 8081 : 8080);
  }

  authRef = getAuth(appRef);
  authRef.useDeviceLanguage();
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_AUTH_EMULATOR))) {
    connectAuthEmulator(
      authRef,
      `http${SSL_DEV ? 's' : ''}://${emulatorHostName}:${SSL_DEV ? 9098 : 9099}`
    );
  }

  storageRef = getStorage(appRef);
  if (shouldUseEmulator(envIsTrue(import.meta.env.VITE_USE_STORAGE_EMULATOR))) {
    connectStorageEmulator(storageRef, emulatorHostName, SSL_DEV ? 9198 : 9199);
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
    connectFunctionsEmulator(usCentral1FunctionsRef, emulatorHostName, SSL_DEV ? 5002 : 5001);
    connectFunctionsEmulator(europeWest1FunctionsRef, emulatorHostName, SSL_DEV ? 5002 : 5001);
  }

  if (
    // Note: Safari 16.4 *in normal mode* does not support Web Push, but there IS support in Home Screen app mode
    // https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
    // Be careful: service worker support is required, and that only works on localhost and HTTPS!
    (await isWebPushSupported()) &&
    typeof import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY !== 'undefined'
  ) {
    messagingRef = getMessaging(appRef);

    onMessage(messagingRef, (payload) => {
      console.log('Message received. ', payload);
      // ...
    });
  }
}
