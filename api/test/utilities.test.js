const { affectedKeys } = require('../src/util/diff');
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
