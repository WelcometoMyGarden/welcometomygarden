import * as fire from 'firebase/app';
import 'firebase/firestore';
import 'firebase/functions';
import 'firebase/auth';

import config from '@/wtmg.config';

const firebaseConfig = {
  ...config.FIREBASE
};

const firebase = fire.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
export const functions = firebase.functions();

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
