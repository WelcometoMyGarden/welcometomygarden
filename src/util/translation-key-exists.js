import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';

export default (key) => {
  return Object.prototype.hasOwnProperty.call(get(dictionary).en, key);
};
