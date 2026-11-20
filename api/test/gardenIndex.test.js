const assert = require('node:assert');
const { gunzipSync } = require('node:zlib');
// Initializes the default app (needed before requiring src modules)
const { db, storage } = require('../seeders/app');
const {
  LISTED_GARDENS_PATH,
  FACILITY_BITS_ORDER,
  toGardenRow,
  isPublicProjectionChanged,
  buildListedGardensFile
} = require('../src/gardenIndex/generate');

/** @type {Garden} */
const fullGarden = {
  description: 'A secret description, with a phone number 0479000000',
  location: { latitude: 50.952798579681854, longitude: 4.763172541851901 },
  facilities: {
    capacity: 3,
    toilet: true,
    shower: false,
    electricity: true,
    water: false,
    drinkableWater: false,
    bonfire: true
  },
  photo: 'garden.jpg',
  listed: true
};

describe('garden index: projection', () => {
  it('encodes a compact row: [id, lat, lng, facilityBits, capacity, ext]', () => {
    const row = toGardenRow('abc', {
      ...fullGarden,
      // Unknown facility keys are dropped
      facilities: { ...fullGarden.facilities, /** @type {any} */ secret: true }
    });
    // toilet (1 << 2) + bonfire (1 << 3) + electricity (1 << 4)
    assert.deepStrictEqual(row, ['abc', 50.9528, 4.76317, 28, 3, 'jpg']);
    // Same fixture as tests/unit/listed-gardens.test.ts, which decodes it on the frontend
    assert.strictEqual(JSON.stringify(row), '["abc",50.9528,4.76317,28,3,"jpg"]');
  });

  it('uses the facility bit order shared with the frontend', () => {
    // Keep in sync with FACILITY_BITS_ORDER in src/lib/util/listed-gardens.ts
    assert.deepStrictEqual(FACILITY_BITS_ORDER, [
      'water',
      'drinkableWater',
      'toilet',
      'bonfire',
      'electricity',
      'shower'
    ]);
    const all = Object.fromEntries(FACILITY_BITS_ORDER.map((k) => [k, true]));
    const row = toGardenRow('x', { ...fullGarden, facilities: { capacity: 1, ...all } });
    assert.strictEqual(row?.[3], 0b111111);
  });

  it('encodes the photo extension, or an empty string without photo', () => {
    assert.strictEqual(toGardenRow('x', { ...fullGarden, photo: 'garden.JPEG' })?.[5], 'JPEG');
    assert.strictEqual(toGardenRow('x', { ...fullGarden, photo: null })?.[5], '');
    assert.strictEqual(toGardenRow('x', { ...fullGarden, photo: undefined })?.[5], '');
  });

  it('rounds negative and integer coordinates', () => {
    const row = toGardenRow('x', {
      ...fullGarden,
      location: { latitude: -33.123456789, longitude: 151 }
    });
    assert.deepStrictEqual(row?.slice(1, 3), [-33.12346, 151]);
  });

  it('normalizes the capacity to a positive number', () => {
    /** @param {any} facilities */
    const capacityOf = (facilities) => toGardenRow('x', { ...fullGarden, facilities })?.[4];
    assert.strictEqual(capacityOf({}), 1);
    assert.strictEqual(capacityOf({ capacity: '4' }), 4);
    assert.strictEqual(capacityOf({ capacity: '<b>' }), 1);
    assert.strictEqual(capacityOf({ capacity: 0 }), 1);
  });

  it('skips gardens without a usable location', () => {
    assert.strictEqual(toGardenRow('x', undefined), null);
    assert.strictEqual(
      toGardenRow('x', { ...fullGarden, location: /** @type {any} */ (null) }),
      null
    );
    assert.strictEqual(
      toGardenRow('x', {
        ...fullGarden,
        location: /** @type {any} */ ({ latitude: '50', longitude: 4 })
      }),
      null
    );
    assert.strictEqual(
      toGardenRow('x', { ...fullGarden, location: { latitude: 91, longitude: 4 } }),
      null
    );
  });

  it('builds a sorted, versioned file', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const file = buildListedGardensFile(
      [
        { id: 'b', data: () => fullGarden },
        { id: 'c', data: () => ({ ...fullGarden, location: /** @type {any} */ (undefined) }) },
        { id: 'a', data: () => fullGarden }
      ],
      now
    );
    assert.strictEqual(file.version, 1);
    assert.strictEqual(file.generatedAt, now.toISOString());
    assert.deepStrictEqual(
      file.gardens.map(([id]) => id),
      ['a', 'b']
    );
    assert(!JSON.stringify(file).includes('secret description'));
  });
});

describe('garden index: change detection', () => {
  it('ignores changes to unpublished fields', () => {
    assert.strictEqual(
      isPublicProjectionChanged(fullGarden, { ...fullGarden, description: 'new' }, 'x'),
      false
    );
  });

  it('ignores location changes below the published precision', () => {
    const moved = {
      ...fullGarden,
      location: { ...fullGarden.location, latitude: fullGarden.location.latitude + 1e-9 }
    };
    assert.strictEqual(isPublicProjectionChanged(fullGarden, moved, 'x'), false);
  });

  it('detects published changes', () => {
    const cases = [
      { ...fullGarden, listed: false },
      { ...fullGarden, location: { latitude: 51, longitude: 4 } },
      { ...fullGarden, facilities: { ...fullGarden.facilities, shower: true } },
      { ...fullGarden, facilities: { ...fullGarden.facilities, capacity: 5 } },
      { ...fullGarden, photo: 'garden.png' },
      { ...fullGarden, photo: null }
    ];
    cases.forEach((after) =>
      assert.strictEqual(isPublicProjectionChanged(fullGarden, after, 'x'), true)
    );
  });

  it('detects creations and deletions of listed gardens only', () => {
    assert.strictEqual(isPublicProjectionChanged(null, fullGarden, 'x'), true);
    assert.strictEqual(isPublicProjectionChanged(fullGarden, null, 'x'), true);
    const unlisted = { ...fullGarden, listed: false };
    assert.strictEqual(isPublicProjectionChanged(null, unlisted, 'x'), false);
    assert.strictEqual(isPublicProjectionChanged(unlisted, null, 'x'), false);
  });
});

// This test requires the Firestore, Functions (with Cloud Tasks) and Storage emulators.
// It doesn't clear Firestore: it only touches (and cleans up) its own uniquely named gardens.
describe('garden index: regeneration (emulators)', function () {
  this.timeout(40_000);

  const { wait } = require('../src/util/time');
  const prefix = `gardenIndexTest-${Date.now()}-`;
  const ids = ['g1', 'g2', 'g3'].map((id) => `${prefix}${id}`);
  const unlistedId = `${prefix}unlisted`;
  const campsites = db.collection('campsites');

  const readFile = async () => {
    const file = storage.bucket('demo-test.appspot.com').file(LISTED_GARDENS_PATH);
    const [[contents], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
    // The emulator may or may not decompress on download
    const json = contents[0] === 0x1f && contents[1] === 0x8b ? gunzipSync(contents) : contents;
    return { file: /** @type {ListedGardensFile} */ (JSON.parse(json.toString())), metadata };
  };

  /** @param {ListedGardensFile} f */
  const testIdsIn = (f) => f.gardens.map(([id]) => id).filter((id) => id.startsWith(prefix));

  /**
   * Polls until the predicate holds for the generated file.
   * @param {(f: ListedGardensFile) => boolean} predicate
   */
  const waitForFile = async (predicate, timeoutMs = 15_000) => {
    /* eslint-disable no-await-in-loop -- sequential polling is intended */
    const start = Date.now();
    /** @type {unknown} */
    let lastError;
    while (Date.now() - start < timeoutMs) {
      try {
        const result = await readFile();
        if (predicate(result.file)) return result;
      } catch (e) {
        lastError = e;
      }
      await wait(500);
    }
    throw new Error(`Timed out waiting for the listed gardens file: ${String(lastError)}`);
    /* eslint-enable no-await-in-loop */
  };

  after(async () => {
    await Promise.all([...ids, unlistedId].map((id) => campsites.doc(id).delete()));
  });

  it('regenerates the file after listed garden changes, and coalesces bursts', async () => {
    // A burst of writes
    await Promise.all(
      ids.map((id, i) =>
        campsites.doc(id).set({ ...fullGarden, location: { latitude: 50 + i, longitude: 4 } })
      )
    );
    await campsites.doc(unlistedId).set({ ...fullGarden, listed: false });

    const { file, metadata } = await waitForFile((f) => testIdsIn(f).length === 3);
    assert.deepStrictEqual(testIdsIn(file), ids);
    assert(!JSON.stringify(file).includes('secret description'));
    assert.strictEqual(metadata.contentType, 'application/json');
    assert.strictEqual(metadata.cacheControl, 'public, max-age=86400');
    assert.match(String(metadata.metadata?.firebaseStorageDownloadTokens), /^[0-9a-f-]{36}$/);

    // Unlisting removes it from the file
    const token = metadata.metadata?.firebaseStorageDownloadTokens;
    await campsites.doc(ids[1]).update({ listed: false });
    const { file: file2, metadata: metadata2 } = await waitForFile(
      (f) => testIdsIn(f).length === 2
    );
    assert.deepStrictEqual(testIdsIn(file2), [ids[0], ids[2]]);
    // A new download token was minted
    assert.notStrictEqual(metadata2.metadata?.firebaseStorageDownloadTokens, token);

    // The debounce state settles
    await wait(3000);
    const state = (await db.doc('system/garden-regen').get()).data();
    assert.strictEqual(state?.pending, false);
  });
});
