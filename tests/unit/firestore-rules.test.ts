// Based on https://github.com/firebase/quickstart-testing/blob/master/unit-test-security-rules-v9/test/firestore.spec.js
// Guide: https://firebase.google.com/docs/rules/unit-tests

// Start emulators before executing tests.

import { readFileSync, createWriteStream } from 'fs';
import http from 'http';

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';

import { doc, serverTimestamp, setDoc, setLogLevel, updateDoc } from 'firebase/firestore';
import type firebase from 'firebase/compat/app';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Silence expected rules rejections from Firestore SDK. Unexpected rejections
  // will still bubble up and will be thrown as an error (failing the tests).
  setLogLevel('error');

  const rules = readFileSync('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules
    }
  });
});

afterAll(async () => {
  // Delete all the FirebaseApp instances created during testing.
  // Note: this does not affect or clear any data.
  await testEnv.cleanup();

  // Write the coverage report to a file
  const coverageFile = 'firestore-coverage.html';
  const fstream = createWriteStream(coverageFile);
  await new Promise((resolve, reject) => {
    if (!testEnv.emulators.firestore) {
      throw new Error('Test emulator API not online');
    }
    const { host, port } = testEnv.emulators.firestore;
    const quotedHost = host.includes(':') ? `[${host}]` : host;
    http.get(
      `http://${quotedHost}:${port}/emulator/v1/projects/${testEnv.projectId}:ruleCoverage.html`,
      (res) => {
        res.pipe(fstream, { end: true });

        res.on('end', resolve);
        res.on('error', reject);
      }
    );
  });

  console.log(`View firestore rule coverage information at ${coverageFile}\n`);
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('registration', async () => {
  it('should not allow an authenticated user to create their own "user" or "user-private" docs', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore();

    await assertFails(
      setDoc(doc(aliceDb, 'users/alice'), {
        firstName: 'Alice',
        countryCode: 'BE'
      })
    );

    await assertFails(setDoc(doc(aliceDb, 'users-private/alice'), {}));
  });
});

const createAliceUser = async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    // This can only be called once.
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'users/alice'), {
      firstName: 'Kim',
      countryCode: 'DE',
      superfan: false
    });

    await setDoc(doc(firestore, 'users-private/alice'), {
      lastName: 'Frazier',
      consentedAt: serverTimestamp(),
      emailPreferences: {
        newChat: true,
        news: true
      }
    });
  });

  return aliceDb;
};

describe('"user" data', async () => {
  let testDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    testDb = await createAliceUser();
  });
  it('should allow ONLY signed in users to update their users document with (a) required field', async () => {
    await assertSucceeds(
      updateDoc(doc(testDb, 'users/alice'), {
        firstName: 'Alice',
        countryCode: 'BE'
      })
    );
  });

  it('should allow ONLY signed in users to overwrite their doc with all required fields', async () => {
    await assertSucceeds(
      setDoc(doc(testDb, 'users/alice'), {
        firstName: 'Alice',
        countryCode: 'BE',
        // "superfan: false" does not lead to a change
        superfan: false
      })
    );

    // Missing countryCode & superfan field
    await assertFails(
      setDoc(doc(testDb, 'users/alice'), {
        firstName: 'Alice'
      })
    );
  });

  it('should NOT allow a user to change their superfan status', async () => {
    await assertFails(
      updateDoc(doc(testDb, 'users/alice'), {
        superfan: true
      })
    );
  });

  it('fails when user docs are updated with invalid data', async () => {
    await assertFails(
      updateDoc(doc(testDb, 'users/alice'), {
        firstName: null,
        countryCode: null
      })
    );
  });
});

describe('"user-private" data', async () => {
  let testDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    testDb = await createAliceUser();
  });
  it('fails when trying to create a document (firebase-admin required) ', async () => {
    await assertFails(setDoc(doc(testDb, 'users-private/bob'), {}));
  });
  it('fails on overwrite when the basic field requirements are met', async () => {
    await assertFails(
      setDoc(doc(testDb, 'users-private/alice'), {
        lastName: 'Frazier',
        consentedAt: serverTimestamp(),
        emailPreferences: {
          // missing newChat
          news: true
        }
      })
    );
  });
  it('succeeds on overwrite when the basic field requirements are met', async () => {
    await assertSucceeds(
      setDoc(doc(testDb, 'users-private/alice'), {
        lastName: 'Frazier',
        consentedAt: serverTimestamp(),
        emailPreferences: {
          newChat: true,
          news: true
        }
      })
    );
  });
  it('fails on update when lastName is empty', async () => {
    await assertFails(
      updateDoc(doc(testDb, 'users-private/alice'), {
        lastName: ''
      })
    );
  });
  it('disallows setting a Stripe customer ID', async () => {
    await assertFails(
      updateDoc(doc(testDb, 'users-private/alice'), {
        stripeCustomerId: 'superCustomer'
      })
    );
  });
  it('disallows setting Stripe subscription details', async () => {
    await assertFails(
      updateDoc(doc(testDb, 'users-private/alice'), {
        stripeSubscription: {
          priceId: '123'
        }
      })
    );
  });
});
