<script lang="ts">
  import ViteSVG from '$lib/components/UI/ViteSVG.svelte';

  let {
    icon,
    href,
    locale
  }: {
    icon: string | object[];
    href: string;
    isAltGoogleSvg?: boolean;
    locale: string;
  } = $props();
</script>

<!-- @component
  A display store badge component, decoupled from i18n loading.
 -->

<a {href} target={href ? '_blank' : undefined} class="store-badge-link locale-{locale}">
  <ViteSVG {icon} placeholderColor="#000" placeholderWidth="130px" placeholderHeight="40px" />
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

  /* text */
  .store-badge-link.locale-nl :global(svg#artwork .st3),
  .store-badge-link.locale-en :global(svg#artwork .st3),
  .store-badge-link.locale-it :global(svg#artwork .st4),
  .store-badge-link.locale-pl :global(svg#artwork .st4),
  .store-badge-link.locale-sv :global(svg#artwork .st4),
  .store-badge-link.locale-ro :global(svg#artwork .st5) {
    fill: #000;
  }
  .store-badge-link:global(.locale-nl svg#artwork .st4),
  .store-badge-link:global(.locale-en svg#artwork .st4) {
    fill: #34a853;
  }
  .store-badge-link:global(.locale-nl svg#artwork .st5),
  .store-badge-link:global(.locale-en svg#artwork .st5) {
    fill: #fbbc04;
  }

  /* fr, de, it, ro & fr */
  .store-badge-link:global(.locale-fr svg#artwork .st4),
  .store-badge-link:global(.locale-es svg#artwork .st4),
  .store-badge-link:global(.locale-de svg#artwork .st4),
  .store-badge-link:global(.locale-ro svg#artwork .st4) {
    fill: #fbbc04;
  }
  .store-badge-link:global(.locale-fr svg#artwork .st3),
  .store-badge-link:global(.locale-es svg#artwork .st3),
  .store-badge-link:global(.locale-de svg#artwork .st3),
  .store-badge-link:global(.locale-it svg#artwork .st3),
  .store-badge-link:global(.locale-ro svg#artwork .st3) {
    fill: #34a853;
  }
  .store-badge-link:global(.locale-fr svg#artwork .st0) {
    fill: #4285f4;
  }

  /* it, pl and sv */
  .store-badge-link:global(.locale-it svg#artwork .st2),
  .store-badge-link:global(.locale-pl svg#artwork .st2),
  .store-badge-link:global(.locale-sv svg#artwork .st2) {
    fill: #34a853;
    stroke: #34a853;
  }
  .store-badge-link:global(.locale-it svg#artwork .st3),
  .store-badge-link:global(.locale-pl svg#artwork .st3) {
    fill: #fbbc04;
  }

  /* de */

  /* Google badges second style */
  /* Google Play text */

  .store-badge-link:global(.locale-fr svg#artwork .st5),
  .store-badge-link:global(.locale-es svg#artwork .st5),
  .store-badge-link:global(.locale-de svg#artwork .st5) {
    fill: #000;
  }
</style>
