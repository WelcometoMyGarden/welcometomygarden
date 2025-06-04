<script>
  import { locale } from 'svelte-i18n';

  import ISO6391 from 'iso-639-1';
  import { Select } from './UI';
  import { SUPPORTED_LANGUAGES } from '$lib/types/general';

  let allAvailableLocales = ISO6391.getLanguages([...SUPPORTED_LANGUAGES]);
</script>

<Select bind:value={$locale} name="language-selector" transparent globe>
  {#each allAvailableLocales as { code, name, nativeName } (name)}
    <option value={code}>{nativeName}</option>
  {/each}
</Select>
