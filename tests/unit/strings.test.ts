import { removeDiacritics } from '$lib/util';
import createSlug from '$lib/util/createSlug';
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

describe('Capitalization', () => {
  // https://github.com/WelcometoMyGarden/welcometomygarden/commit/7ebbc78de692c98a8a8f5b5d71e181df2e3d771f
  const oldCapitalizationFunc = (str: string) =>
    str.replace(/\b(\w)/g, (s: string) => s.toUpperCase());

  it('The old function capitalizes wrongly', () => {
    expect(oldCapitalizationFunc('valérie')).toBe('ValéRie');
  });

  // The global regex is the problem; accents are seen as word boundaries it seems
  // https://stackoverflow.com/a/2449892/4973029 - no unicode/latin awareness
  // Even with the /u flag it doesn't work.
  const newCapitalizationFunc = (str: string) =>
    //
    // str.replace(/\b(\w)/gu, (s: string) => s.toUpperCase());
    //
    // \S as a replacement for \w, which doesn't support unicode
    str.replace(/(?:^|\s|[-_])(\S)/g, (s) => s.toUpperCase());
  const expectationMap = {
    valérie: 'Valérie',
    françois: 'François',
    // two letters that should be capitalized
    'jean-françois': 'Jean-François',
    // expect the middle "and" to get capitalized too
    'jeanne et françois': 'Jeanne Et François',
    bert: 'Bert',
    // first letter accent example
    élodie: 'Élodie',
    čárka: 'Čárka'
  };

  it('The new function capitalizes correctly', () => {
    Object.entries(expectationMap).forEach(([source, expected]) => {
      expect(newCapitalizationFunc(source)).toBe(expected);
    });
  });
});
