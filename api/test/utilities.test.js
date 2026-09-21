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
