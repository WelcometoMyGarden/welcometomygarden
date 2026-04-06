<script lang="ts">
  // These are all above 4 KiB, so they will not be inlined
  import appleDE from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_DE_RGB_wht_092917.svg';
  import appleEN from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg';
  import appleES from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_ES_RGB_wht_100217.svg';
  import appleFR from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_FR_RGB_wht_100217.svg';
  import appleNL from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_NL_RGB_wht_101217.svg';
  import googleDE from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_German.svg';
  import googleEN from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_English.svg';
  import googleES from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Spanish.svg';
  import googleFR from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_French.svg';
  import googleNL from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Dutch.svg';
  import ViteSVG from '$lib/components/UI/ViteSVG.svelte';
  import { locale } from 'svelte-i18n';
  import { coerceToSupportedLanguage } from '$lib/util/translation-shared';
  import { appleAppStoreUrl, googlePlayStoreUrl } from '$lib/util/translation-helpers';

  let { platform }: { platform: 'apple' | 'google' } = $props();

  const svgFile = {
    apple: {
      de: appleDE,
      en: appleEN,
      es: appleES,
      fr: appleFR,
      nl: appleNL
    },
    google: {
      de: googleDE,
      en: googleEN,
      es: googleES,
      fr: googleFR,
      nl: googleNL
    }
  };
</script>

<a
  href={platform === 'apple' ? $appleAppStoreUrl : $googlePlayStoreUrl}
  target="_blank"
  class="store-badge-link"
  class:is-alt-google-svg={platform === 'google' &&
    ['fr', 'es', 'de'].includes(coerceToSupportedLanguage($locale))}
>
  <ViteSVG
    icon={svgFile[platform][coerceToSupportedLanguage($locale)]}
    placeholderColor="#000"
    placeholderWidth="130px"
    placeholderHeight="40px"
  ></ViteSVG>
</a>

<style>
  .store-badge-link {
    /* To prevent some weird extra height to be added to the Google svg otherwise */
    display: flex;
  }

  /* Google badges first style */
  /* Background rect */
  .store-badge-link :global(svg#artwork rect) {
    fill: #fff;
  }
  /* Border */
  .store-badge-link :global(svg#artwork .st1),
  /* White top text */
  .store-badge-link :global(svg#artwork .st2),
  /* Google Play text */
  .store-badge-link:not(.store-badge-link.is-alt-google-svg) :global(svg#artwork .st3) {
    fill: #000;
  }

  /* Google badges second style */
  /* Google Play text */
  .store-badge-link.is-alt-google-svg :global(svg#artwork .st5) {
    fill: #000;
  }
</style>
