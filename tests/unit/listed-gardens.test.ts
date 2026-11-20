import { describe, expect, it } from 'vitest';
import {
  FACILITY_BITS_ORDER,
  parseListedGardenRow,
  parseListedGardensFile
} from '$lib/util/listed-gardens';
import type { ListedGardenRow, ListedGardensFile } from '$lib/types/Garden';

// Same fixture as api/test/gardenIndex.test.js, which encodes it in the generator
const row = JSON.parse('["abc",50.9528,4.76317,28,3,"jpg"]') as ListedGardenRow;

describe('listed gardens file parsing', () => {
  it('uses the facility bit order shared with the generator', () => {
    // Keep in sync with FACILITY_BITS_ORDER in api/src/gardenIndex/generate.js
    expect(FACILITY_BITS_ORDER).toEqual([
      'water',
      'drinkableWater',
      'toilet',
      'bonfire',
      'electricity',
      'shower'
    ]);
  });

  it('decodes a compact row', () => {
    expect(parseListedGardenRow(row)).toEqual({
      id: 'abc',
      location: { latitude: 50.9528, longitude: 4.76317 },
      facilities: { capacity: 3, toilet: true, bonfire: true, electricity: true },
      photo: 'garden.jpg'
    });
  });

  it('decodes all and no facilities, and a missing photo', () => {
    const all = parseListedGardenRow(['x', 1, 2, 0b111111, 1, '']);
    expect(all.facilities).toEqual({
      capacity: 1,
      ...Object.fromEntries(FACILITY_BITS_ORDER.map((k) => [k, true]))
    });
    expect(all.photo).toBeNull();
    expect(parseListedGardenRow(['x', 1, 2, 0, 2, 'png']).facilities).toEqual({ capacity: 2 });
  });

  it('decodes a file, and rejects unsupported versions', () => {
    const file: ListedGardensFile = { version: 1, generatedAt: '', gardens: [row] };
    expect(parseListedGardensFile(file).map((g) => g.id)).toEqual(['abc']);
    expect(() =>
      parseListedGardensFile({ ...file, version: 2 } as unknown as ListedGardensFile)
    ).toThrow(/version/);
  });
});
