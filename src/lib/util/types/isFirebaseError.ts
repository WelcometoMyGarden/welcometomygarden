import type { FirebaseError } from 'firebase/app';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (object: any): object is FirebaseError =>
  !!object && typeof object.code === 'string' && typeof object.name === 'string';
