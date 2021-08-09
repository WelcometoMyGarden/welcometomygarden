import { register } from 'svelte-i18n';
import availableLocales from 'app-available-locales';

export default () => {
  availableLocales.forEach((lang) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });
};
