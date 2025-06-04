import { register } from 'svelte-i18n';
import { SUPPORTED_LANGUAGES } from '$lib/types/general';

export default () => {
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });
};
