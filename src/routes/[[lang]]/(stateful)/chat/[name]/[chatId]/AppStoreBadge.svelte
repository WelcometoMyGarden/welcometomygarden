<script lang="ts">
  // These are all above 4 KiB, so they will not be inlined
  import appleDE from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_DE_RGB_wht_092917.svg';
  import appleEN from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg';
  import appleES from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_ES_RGB_wht_100217.svg';
  import appleFR from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_FR_RGB_wht_100217.svg';
  import appleIT from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_IT_RGB_wht_100317.svg';
  import appleNL from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_NL_RGB_wht_101217.svg';
  import applePL from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_PL_RGB_wht_100317.svg';
  import appleRO from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_RO_RGB_wht_100317.svg';
  import appleSV from '$lib/assets/app-badges/Download_on_the_App_Store_Badge_SE_RGB_wht_100317.svg';
  import googleDE from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_German.svg';
  import googleEN from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_English.svg';
  import googleES from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Spanish.svg';
  import googleFR from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_French.svg';
  import googleIT from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Italian.svg';
  import googleNL from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Dutch.svg';
  import googlePL from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Polish.svg';
  import googleRO from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Romanian.svg';
  import googleSV from '$lib/assets/app-badges/GetItOnGooglePlay_Badge_Web_color_Swedish.svg';
  import StoreBadge from '$lib/components/UI/StoreBadge.svelte';
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
      it: appleIT,
      nl: appleNL,
      pl: applePL,
      ro: appleRO,
      sv: appleSV
    },
    google: {
      de: googleDE,
      en: googleEN,
      es: googleES,
      fr: googleFR,
      it: googleIT,
      nl: googleNL,
      pl: googlePL,
      ro: googleRO,
      sv: googleSV
    }
  };
</script>

<StoreBadge
  icon={svgFile[platform][coerceToSupportedLanguage($locale)]}
  href={platform === 'apple' ? $appleAppStoreUrl : $googlePlayStoreUrl}
  locale={coerceToSupportedLanguage($locale)}
/>
