const { affectedKeys, affectedPaths, onlyAffects } = require('../src/util/diff');
const assert = require('node:assert');
const lodash = require('lodash');
const { Timestamp } = require('firebase-admin/firestore');
const { xor } = lodash;

describe('affectedKeys', () => {
  it('detects no change with simple values', () => {
    const keys = affectedKeys({ a: '1', b: 2 }, { a: '1', b: 2 });
    assert.deepEqual(keys, []);
  });
  it('detects changes with simple values', () => {
    const keys = affectedKeys({ a: '1', b: 2, c: 0 }, { a: '1', b: 3 });
    // has b and c
    assert.deepEqual([], xor(['b', 'c'], keys));
  });
  it('does not detect changes with Firebase Timestamp values', () => {
    const date = new Date(2025, 0, 1);
    const keys = affectedKeys(
      { date: Timestamp.fromDate(date) },
      { date: Timestamp.fromDate(date) }
    );
    assert.deepEqual([], keys);
  });
});

describe('affectedPaths', () => {
  it('detects no change', () => {
    const paths = affectedPaths({ a: '1', b: { c: true } }, { a: '1', b: { c: true } });
    assert.deepEqual(paths, []);
  });
  it('reports nested changes with a dot-separated path', () => {
    const paths = affectedPaths(
      { emailPreferences: { newChat: true, news: true } },
      { emailPreferences: { newChat: false, news: true } }
    );
    assert.deepEqual(paths, ['emailPreferences.newChat']);
  });
  it('reports an added or removed map under its own path', () => {
    assert.deepEqual(affectedPaths({}, { emailPreferences: { newChat: true } }), [
      'emailPreferences'
    ]);
    assert.deepEqual(affectedPaths({ emailPreferences: { newChat: true } }, {}), [
      'emailPreferences'
    ]);
  });
  it('does not descend into Firebase Timestamps or arrays', () => {
    const date = new Date(2025, 0, 1);
    assert.deepEqual(
      affectedPaths({ date: Timestamp.fromDate(date) }, { date: Timestamp.fromDate(date) }),
      []
    );
    assert.deepEqual(affectedPaths({ savedGardens: ['a'] }, { savedGardens: ['a', 'b'] }), [
      'savedGardens'
    ]);
  });
  it('reports several changes at different depths', () => {
    const paths = affectedPaths(
      { lastName: 'One', emailPreferences: { newChat: true, news: true } },
      { lastName: 'Two', emailPreferences: { newChat: false, news: true } }
    );
    assert.deepEqual([], xor(['lastName', 'emailPreferences.newChat'], paths));
  });
});

describe('onlyAffects', () => {
  const allowed = ['emailPreferences.newChat'];

  it('is true when only the allowed path changed', () => {
    assert.strictEqual(
      onlyAffects(
        { lastName: 'One', emailPreferences: { newChat: true, news: true } },
        { lastName: 'One', emailPreferences: { newChat: false, news: true } },
        allowed
      ),
      true
    );
  });
  it('is false when another path changed too', () => {
    assert.strictEqual(
      onlyAffects(
        { lastName: 'One', emailPreferences: { newChat: true, news: true } },
        { lastName: 'Two', emailPreferences: { newChat: false, news: true } },
        allowed
      ),
      false
    );
  });
  it('is false when nothing changed at all', () => {
    const doc = { emailPreferences: { newChat: true, news: true } };
    assert.strictEqual(onlyAffects(doc, { ...doc }, allowed), false);
  });
});

describe('isRenewalPeriod', () => {
  const { isRenewalPeriod } = require('../src/subscriptions/stripeEventHandlers/util');
  const { oneDaySecs, oneHourSecs } = require('../src/util/time');
  const startDate = 1_760_000_000;

  it('is false when the first period starts at the subscription start', () => {
    assert.equal(isRenewalPeriod(startDate, startDate), false);
  });
  it('is false when the first period was re-anchored shortly after the start', () => {
    assert.equal(isRenewalPeriod(startDate, startDate + 23 * oneHourSecs), false);
  });
  it('is true for a period starting a year after the start', () => {
    assert.equal(isRenewalPeriod(startDate, startDate + 365 * oneDaySecs), true);
  });
});

describe('createUnsubscribeURL', () => {
  const { createUnsubscribeURL } = require('../src/util/mail');
  const { parseEmailAuth } = require('../src/user/util/parseEmailAuth');
  const originalFrontendUrl = process.env.FRONTEND_URL;

  before(() => {
    process.env.FRONTEND_URL = 'https://welcometomygarden.org/';
  });
  after(() => {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it('creates an encoded email preferences URL that round-trips through parseEmailAuth', () => {
    const email = 'jane+test@example.com';
    const secret = 'abc123';
    const url = createUnsubscribeURL({
      email,
      secret,
      flow: 'welcome_mar_25',
      content: '1_welcome'
    });
    assert.equal(
      url,
      'https://welcometomygarden.org/email-preferences?e=jane%2Btest%40example.com&s=abc123&utm_source=welcome_mar_25&utm_medium=email&utm_content=1_welcome'
    );
    const parsed = parseEmailAuth(Object.fromEntries(new URL(url).searchParams));
    assert.deepEqual(parsed, { email, secret });

  });
