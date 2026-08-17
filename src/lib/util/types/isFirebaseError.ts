import type { FirebaseError } from 'firebase/app';

export default (object: any): object is FirebaseError =>
  !!object && typeof object.code === 'string' && typeof object.name === 'string';
