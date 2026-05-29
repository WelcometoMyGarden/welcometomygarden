// Based on https://github.com/firebase/quickstart-testing/blob/master/unit-test-security-rules-v9/test/firestore.spec.js
// Guide: https://firebase.google.com/docs/rules/unit-tests

// Start empty emulators before executing tests.

import { readFileSync, createWriteStream } from 'fs';
import http from 'http';

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing';

import {
  doc,
  serverTimestamp,
  setDoc,
  setLogLevel,
  collection,
  Timestamp,
  updateDoc,
  getDoc,
  query,
  getDocs
} from 'firebase/firestore';
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

const ALICE_TOKEN_OPTS = { email: 'alice@slowby.travel', email_verified: true };
const BOB_TOKEN_OPTS = { email: 'bob@slowby.travel', email_verified: true };
const CHARLIE_TOKEN_OPTS = { email: 'charlie@slowby.travel', email_verified: true };

describe('registration', async () => {
  it('should not allow an authenticated user to create their own "user" or "user-private" docs', async () => {
    const aliceDb = testEnv.authenticatedContext('alice', ALICE_TOKEN_OPTS).firestore();

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
  const aliceDb = testEnv.authenticatedContext('alice', ALICE_TOKEN_OPTS).firestore();

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

/**
 * An alternative user (non-superfan)
 */
const createBobUser = async () => {
  const bobDb = testEnv.authenticatedContext('bob', BOB_TOKEN_OPTS).firestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    // This can only be called once.
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'users/bob'), {
      firstName: 'Bob',
      countryCode: 'DK',
      superfan: false
    });

    await setDoc(doc(firestore, 'users-private/alice'), {
      lastName: 'Bobber',
      consentedAt: serverTimestamp(),
      emailPreferences: {
        newChat: true,
        news: true
      }
    });
  });
  return bobDb;
};

describe('"user" data', async () => {
  let testDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    testDb = await createAliceUser();
  });
  it('allows reading your own public user data', async () => {
    await assertSucceeds(getDoc(doc(testDb, 'users/alice')));
  });
  it('allows reading public user data of any individual user', async () => {
    // Create the "bob" user
    await createBobUser();

    // Get bob's data
    await assertSucceeds(getDoc(doc(testDb, 'users/bob')));
  });
  it('disallows listing users data', async () => {
    await assertFails(getDocs(query(collection(testDb, 'users'))));
  });
  it('should allow ONLY signed in users to update their users document with fields they are allowed to change', async () => {
    await assertSucceeds(
      updateDoc(doc(testDb, 'users/alice'), {
        savedGardens: []
      })
    );
    // Other users can't do this
    const bobDb = await createBobUser();
    await assertFails(
      updateDoc(doc(bobDb, 'users/alice'), {
        savedGardens: []
      })
    );
  });

  it('should NOT allow even signed in users to set/overwrite their entire users doc', async () => {
    await assertFails(
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

describe('"campsites" data', async () => {
  let testDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    testDb = await createAliceUser();
  });
  const validGarden = {
    description: 'Hello, this is a test description with sufficient minimal length.',
    location: { latitude: 50.1, longitude: 14.2 },
    facilities: {
      capacity: 2,
      toilet: true,
      shower: true,
      electricity: false,
      water: true,
      drinkableWater: true,
      bonfire: false,
      tent: true
    },
    listed: true,
    photo: 'garden.jpg'
  };
  it('succeeds when trying to add a valid garden, and update it', async () => {
    await assertSucceeds(setDoc(doc(testDb, 'campsites/alice'), validGarden));
    await assertSucceeds(
      updateDoc(doc(testDb, 'campsites/alice'), {
        description: 'here is another valid long description that I can change to'
      })
    );
  });
  it('succeeds when trying to add a garden without a tent facility too (legacy, got removed)', async () => {
    const { tent, ...reducedFacilities } = validGarden.facilities;
    await assertSucceeds(
      setDoc(doc(testDb, 'campsites/alice'), { ...validGarden, facilities: reducedFacilities })
    );
  });
  it('fails when trying to update garden-listing related timestamps', async () => {
    // First create
    await setDoc(doc(testDb, 'campsites/alice'), validGarden);
    // Try illegal update
    await assertFails(
      updateDoc(doc(testDb, 'campsites/alice'), {
        latestRemovedAt: Timestamp.now()
      })
    );
  });
});

describe('"user-private" data', async () => {
  let testDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    testDb = await createAliceUser();
  });
  it('allows getting your own users-private data', async () => {
    await assertSucceeds(getDoc(doc(testDb, 'users-private/alice')));
  });
  it('disallows listing users-private data in general', async () => {
    await assertFails(getDocs(query(collection(testDb, 'users-private'))));
  });
  it('fails when trying to create a document (firebase-admin required) ', async () => {
    await assertFails(setDoc(doc(testDb, 'users-private/bob'), {}));
  });
  it('fails on overwrite (set) the entire doc (clients are not allowed to do this)', async () => {
    await assertFails(
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

describe('chat', async () => {
  let testDb: firebase.firestore.Firestore;
  let bobDb: firebase.firestore.Firestore;
  beforeEach(async () => {
    // Create alice
    testDb = await createAliceUser();
    bobDb = await createBobUser();
    // Test-specific prep
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore();
      // Make Alice a superfan
      await updateDoc(doc(firestore, 'users/alice'), { superfan: true });
    });
  });

  describe('chat creation', async () => {
    const createChatFromAlice = async () => {
      const now = Timestamp.now();
      await setDoc(doc(testDb, 'chats/testchat'), {
        users: ['alice', 'bob'],
        createdAt: now,
        lastActivity: now,
        lastMessage: 'Hello there'
      });
    };

    it('a superfan can start a new chat if it has no users-meta doc', () =>
      assertSucceeds(createChatFromAlice()));

    it('a non-superfan can NOT start a new chat', async () => {
      const now = Timestamp.now();

      await assertFails(
        setDoc(doc(bobDb, 'chats/testchat'), {
          users: ['bob', 'alice'],
          createdAt: now,
          lastActivity: now,
          lastMessage: 'Hello from Bob to Alice'
        })
      );
    });

    it('a superfan can start a new chat if it has an existing users-meta doc without chatBlockedAt prop', async () => {
      // Set alice to chat-blocked by the system
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();

        // Pretend one chat was sent already
        await setDoc(doc(firestore, 'users-meta/alice'), {
          chatWindowStartAt: Timestamp.fromMillis(Date.now() - 3600 * 1000),
          chatCount: 1
        });
      });

      // Alice should still be able to create the chat
      await assertSucceeds(createChatFromAlice());
    });

    it('disallows start a new chat when the user is blocked', async () => {
      // Set alice to chat-blocked by the system
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const firestore = context.firestore();
        await setDoc(doc(firestore, 'users-meta/alice'), {
          chatBlockedAt: Timestamp.now()
        });
      });

      // Alice should not be able to create the chat
      await assertFails(createChatFromAlice());
    });
  });

  describe('chat archive', async () => {
    const chatDoc = () => doc(testDb, 'chats/testchat');

    const seedChat = async (extraFields: Record<string, unknown> = {}) => {
      const now = Timestamp.now();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'chats/testchat'), {
          users: ['alice', 'bob'],
          createdAt: now,
          lastActivity: now,
          lastMessage: 'Hello there',
          ...extraFields
        });
      });
    };

    beforeEach(() => seedChat());

    it('allows a participant to archive the chat (add own uid to archivedBy)', async () => {
      await assertSucceeds(updateDoc(chatDoc(), { archivedBy: ['alice'] }));
    });

    it('allows a participant to unarchive the chat (remove own uid from archivedBy)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await updateDoc(doc(context.firestore(), 'chats/testchat'), { archivedBy: ['alice'] });
      });
      await assertSucceeds(updateDoc(chatDoc(), { archivedBy: [] }));
    });

    it('allows the other participant to archive on their side', async () => {
      const bobDb = await createBobUser();
      await assertSucceeds(updateDoc(doc(bobDb, 'chats/testchat'), { archivedBy: ['bob'] }));
    });

    it('prevents a non-participant from archiving a chat', async () => {
      const charlieDb = testEnv.authenticatedContext('charlie', CHARLIE_TOKEN_OPTS).firestore();
      await assertFails(updateDoc(doc(charlieDb, 'chats/testchat'), { archivedBy: ['charlie'] }));
    });

    it("prevents a participant from adding another user's uid to archivedBy", async () => {
      await assertFails(updateDoc(chatDoc(), { archivedBy: ['bob'] }));
    });

    it('prevents a participant from adding their own uid twice to archivedBy', async () => {
      await assertFails(updateDoc(chatDoc(), { archivedBy: ['alice', 'alice'] }));
    });

    it('prevents creating a chat with archivedBy already set', async () => {
      const now = Timestamp.now();
      await assertFails(
        setDoc(doc(testDb, 'chats/newchat'), {
          users: ['alice', 'bob'],
          createdAt: now,
          lastActivity: now,
          lastMessage: 'Hello there',
          archivedBy: ['alice']
        })
      );
    });
  });
});
