<script lang="ts">
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

  const altGoogleLocales = ['fr', 'es', 'de', 'ro'];

  const badges = [
    { locale: 'en', apple: appleEN, google: googleEN },
    { locale: 'nl', apple: appleNL, google: googleNL },
    { locale: 'fr', apple: appleFR, google: googleFR },
    { locale: 'de', apple: appleDE, google: googleDE },
    { locale: 'es', apple: appleES, google: googleES },
    { locale: 'it', apple: appleIT, google: googleIT },
    { locale: 'pl', apple: applePL, google: googlePL },
    { locale: 'ro', apple: appleRO, google: googleRO },
    { locale: 'sv', apple: appleSV, google: googleSV }
  ];
</script>

<main>
  <h1>App Store Badges</h1>
  <table>
    <thead>
      <tr>
        <th>Locale</th>
        <th>Apple App Store</th>
        <th>Google Play Store</th>
      </tr>
    </thead>
    <tbody>
      {#each badges as { locale, apple, google } (locale)}
        <tr>
          <td>{locale}</td>
          <td class="badge-cell dark">
            <StoreBadge href="" icon={apple} {locale} />
          </td>
          <td class="badge-cell light">
            <StoreBadge
              href=""
              icon={google}
              {locale}
              isAltGoogleSvg={altGoogleLocales.includes(locale)}
            />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</main>

<style>
  main {
    padding: 2rem;
    font-family: sans-serif;
  }

  h1 {
    margin-bottom: 1.5rem;
  }

  table {
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.5rem 1rem;
    text-align: left;
    border: 1px solid #ddd;
  }

  th {
    background: #f5f5f5;
    font-weight: 600;
  }

  .badge-cell {
    display: table-cell;
    vertical-align: middle;
  }

  .dark {
    background: #1a1a1a;
  }

  .light {
    background: #fff;
  }
</style>
