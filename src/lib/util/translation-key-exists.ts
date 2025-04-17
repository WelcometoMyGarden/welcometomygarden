import { get } from 'svelte/store';
import { dictionary } from 'svelte-i18n';
import { get as _get } from 'lodash-es';

/**
 * @param key the period separated translation key
 */
export default (key: string) => {
  return _get(get(dictionary).en, key);
};
