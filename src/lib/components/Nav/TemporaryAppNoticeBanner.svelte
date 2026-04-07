<script lang="ts">
  import { anchorText, appleAppStoreUrl, googlePlayStoreUrl } from '$lib/util/translation-helpers';
  import { isIDevice, isMobileWebDevice } from '$lib/util/uaInfo';
  import { _ } from 'svelte-i18n';

  const link = (href: string, linkText: string) =>
    anchorText({
      href,
      linkText,
      style: 'text-decoration: underline; cursor: pointer;',
      newtab: true
    });
</script>

{#if isMobileWebDevice}
  {@html $_('navigation.banner.single-link', {
    values: {
      link: link(
        isIDevice() ? $appleAppStoreUrl : $googlePlayStoreUrl,
        $_('navigation.banner.link-text')
      )
    }
  })}
{:else}
  {@html $_('navigation.banner.double-link', {
    values: {
      Android: link($googlePlayStoreUrl, 'Android'),
      iPhone: link($appleAppStoreUrl, 'iPhone')
    }
  })}
{/if}
