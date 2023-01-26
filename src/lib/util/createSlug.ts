import removeDiacritics from './removeDiacritics';

/**
 * Creates a slug suitable for using in URLs from a generic string.
 */
export default (str: string) => {
  const withoutDiacritics = removeDiacritics(str);
  return (
    withoutDiacritics
      // Turn adjacent whitespace into dashes,
      .replace(/\s+/g, '-')
      // remove non-alphanumerical characters (retain dashes)
      .replace(/[^A-Za-z0-9-]/g, '')
      .toLocaleLowerCase()
  );
};
