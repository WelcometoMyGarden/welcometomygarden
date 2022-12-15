export const slugify = (...args: (string | number)[]): string => {
  const value = args.join(' ');

  return value
    .normalize('NFD') // split an accented letter in the base letter and the accent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ,.]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/[,.]/g, '_') // separator
    .replace(/\s+/g, '-'); // separator
};

export const removeFileExtension = (filename: string): string => {
  return filename.substring(0, filename.lastIndexOf('.')) || filename;
};

export const readableSlugify = (...args: (string | number)[]): string => {
  const value = args.join(' ');

  return value
    .normalize('NFD') // split an accented letter in the base letter and the accent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .trim()
    .replace(/[^a-z0-9A-Z ,.]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
    .replace(/\s+/g, ' ');
};

export const cleanName = (name: string) => {
  return readableSlugify(removeFileExtension(name));
};
