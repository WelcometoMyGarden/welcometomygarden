<script>
  import { locale } from 'svelte-i18n';
  import allLocales from '@/locales';
  import ISO6391 from 'iso-639-1';

  const setLocale = (event) => {
    locale.set(event.target.value);
  };

  let allAvailableLocales = ISO6391.getLanguages(allLocales);
</script>

<select value={$locale} on:input={setLocale}>
  {#each allAvailableLocales as { code, name, nativeName } (name)}
    <option value={code}>{nativeName}</option>
  {/each}
</select>

<style>
  select {
    background-color: transparent;
    border: 0;
    outline: 0;
    background-image: url(/images/icons/globe.svg), url(/images/icons/caret-down.svg);
    background-repeat: no-repeat;
    background-position: left center, right 0.7rem top 50%;
    background-size: 2rem auto, 0.65em auto, 100%;
    -moz-appearance: none;
    -webkit-appearance: none;
    appearance: none;
    font-size: 1.6rem;
    padding: 0 2rem 0 2.5rem;
    cursor: pointer;
    text-align: left;
  }

  /* Hide default select arrow on IE11 and Edge */
  select::-ms-expand {
    display: none;
  }

  @media screen and (max-width: 700px) {
    select {
      font-size: 1.4rem;
    }
  }
</style>
