<script lang="ts">
  import { locale } from 'svelte-i18n';

  import ISO6391 from 'iso-639-1';
  import { Select } from './UI';
  import { SUPPORTED_LANGUAGES } from '$lib/types/general';
  import type { ChangeEventHandler } from 'svelte/elements';
  import { user } from '$lib/stores/auth';
  import { updateCommunicationLanguage } from '$lib/api/user';
  import setCookie from '$lib/util/set-cookie';
  import { coercedLocale } from '$lib/stores/app';

  let allAvailableLocales = ISO6391.getLanguages([...SUPPORTED_LANGUAGES]);

  $: localeValue = $coercedLocale;

  const onChange = async function (event) {
    const selectedLocale = event.currentTarget.value;
    if (
      !selectedLocale ||
      typeof selectedLocale !== 'string' ||
      !ISO6391.getAllCodes().find((c) => c === selectedLocale)
    ) {
      console.warn('Invalid selected locale');
      return;
    }

    // Always set the locale cookie upon a manual change
    setCookie('locale', selectedLocale, { path: '/' });
    console.log(`Manually changing locale to ${selectedLocale}`);
    if ($user) {
      // Update the remote locale (this will trigger a streamed local locale update in the stores/user.ts)
      // The locale store can't be set optimistically here, because changing it would be quicker than the streamed
      // user update, and the old user comm lang will still be used before the user finishes streaming
      await updateCommunicationLanguage(selectedLocale);
    } else {
      // Set the locale locally
      locale.set(selectedLocale);
    }
  } satisfies ChangeEventHandler<HTMLSelectElement>;
</script>

<Select value={localeValue} on:change={onChange} name="language-selector" transparent globe>
  {#each allAvailableLocales as { code, name, nativeName } (name)}
    <option value={code}>{nativeName}</option>
  {/each}
</Select>
