// This test requires the Auth, Firestore and Functions emulators
const assert = require('node:assert');
const { nanoid } = require('nanoid');

// See https://nodejs.org/docs/latest-v24.x/api/modules.html#loading-ecmascript-modules-using-require
it('ES-only module nanoid v4+ works when require()d in node v24+', () => {
  const id = nanoid();
  assert(typeof id === 'string' && id.length === 21);
});
