<script>
  import { locale } from 'svelte-i18n';
  import availableLocales from 'app-available-locales';

  import ISO6391 from 'iso-639-1';
  import { Select } from './UI';

  let allAvailableLocales = ISO6391.getLanguages(availableLocales);
</script>

<Select bind:value={$locale} name="language-selector" transparent globe>
  {#each allAvailableLocales as { code, name, nativeName } (name)}
    <option value={code}>{nativeName}</option>
  {/each}
</Select>
