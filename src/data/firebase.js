import * as fire from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

import config from '../wtmg.config';

const firebaseConfig = {
  ...config.FIREBASE
};

const firebase = fire.initializeApp(firebaseConfig);

export const db = firebase.firestore();
export const auth = firebase.auth();
auth.useDeviceLanguage();

export default firebase;
