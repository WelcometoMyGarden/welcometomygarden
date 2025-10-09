import { browser } from '$app/environment';
import type { MainLanguage } from '$lib/types/general';
import { coerceToMainLanguage } from '$lib/util/get-browser-lang';
import { locale } from 'svelte-i18n';
import { get } from 'svelte/store';

export type MainLanguageFormIds = { [k in MainLanguage]: string };

const openTallyForm = (forms: MainLanguageFormIds, config: Partial<TallyPopupOptions>) => {
  const formId = forms[coerceToMainLanguage(get(locale))];
  const defaultConfig = {
    // width: { fr: 570, nl: 550, en: 550 }[coerceToMainLanguage($locale)],
    // this blows up the 1-10 size responsively
    width: 580,
    hideTitle: true,
    showOnce: true,
    doNotShowAfterSubmit: true
  };
  window.Tally.openPopup(formId, { ...defaultConfig, ...config });
};

/**
 * Should be combined with a dynamic or static Tally script load like this,
 * on the pages where it is used.
 *
  <script
    src="https://tally.so/widgets/embed.js"
    on:load={() => {
      document.dispatchEvent(new CustomEvent('tally-loaded'));
    }}
  ></script>
 */
export const openTally = (forms: MainLanguageFormIds, config: Partial<TallyPopupOptions> = {}) => {
  if (!browser) {
    return;
  }
  const boundOpener = openTallyForm.bind(null, forms, config);

  if (window.Tally) {
    boundOpener();
  } else {
    console.warn('Tally not loaded yet, adding a load listener');
    document.addEventListener('tally-loaded', boundOpener, { once: true });
  }
};
