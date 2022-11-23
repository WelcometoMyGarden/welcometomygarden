import { register } from 'svelte-i18n';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import availableLocales from 'app-available-locales';

export default () => {
  availableLocales.forEach((lang) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });
};
