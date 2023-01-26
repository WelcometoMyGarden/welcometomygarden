import { removeDiacritics } from '@/lib/util';
import createSlug from '@/lib/util/createSlug';
import { describe, expect, it } from 'vitest';

describe('removeDiacritics', () => {
  it('leaves spaces, dashes and capital letters intact', () => {
    const names = 'Bon-Jacques et Marie';
    expect(removeDiacritics(names)).toBe(names);
  });

  it('Removes diacritics on characters', () => {
    expect(removeDiacritics('Bon-Jâcques ét Marie ça vå')).toBe('Bon-Jacques et Marie ca va');
  });
});

describe('createSlug', () => {
  it('works', () => {
    expect(createSlug('Jardin de Bon-Jâcques ét Marie')).toBe('jardin-de-bon-jacques-et-marie');
  });
});
