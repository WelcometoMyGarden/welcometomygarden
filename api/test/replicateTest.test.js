// This is an integration test that works with the Firestore emulator
const proxyquire = require('proxyquire');
const assert = require('node:assert');
const { describe, it } = require('mocha');
const sinon = require('sinon');

const timeout = 40 * 1000;

/**
 * @type {import('firebase/firestore').DocumentSnapshot}
 */
const fakeDocSnapshot = {
  id: 'fakeid',
  // @ts-ignore
  exists: () => true,
  data: () => ({
    id: 'fakeid'
  })
};

/**
 * @param {number} succeedOnRequest 1-indexed number on which to succeed, all requests before will fail
 */
async function fakeSupabaseReplicate(succeedOnRequest) {
  const upsertStub = sinon.stub();
  const fakeSupabase = {
    from: sinon.fake.returns({
      // Conditional behavior seems only possible with mutable stubs
      upsert: upsertStub.callsFake(() => {
        // count will already be 1 on the first call, it doesn't start at 0 here
        if (upsertStub.callCount < succeedOnRequest) {
          // call 1
          return Promise.resolve({ error: { message: 'TypeError: fetch failed' } });
        }
        // call 2 and more
        return Promise.resolve({ error: null, data: { id: 'fakedoc' } });
      })
    })
  };

  // Inject our fake supabase
  /**
   * @type {{replicate: import('../src/replication/shared').replicate}}
   */
  const { replicate } = proxyquire('../src/replication/shared.js', {
    '../supabase': fakeSupabase
  });
  return replicate({
    change: {
      before: fakeDocSnapshot,
      after: fakeDocSnapshot
    },
    tableName: 'fakeTable'
  });
}

describe('Replication to supabase', () => {
  it('succeeds if Supabase suceeds after a single network failure', async () => {
    assert(await fakeSupabaseReplicate(2));
  });

  it('succeeds if Supabase succeeds on the 7th attempt', async () => {
    assert(await fakeSupabaseReplicate(7));
  }).timeout(timeout);

  it("fails if Supabase fails on the 8th attempt (it doensn't reach this)", async () => {
    assert(!(await fakeSupabaseReplicate(8)));
  }).timeout(timeout);
}).timeout(timeout);
