<!-- @component
  Vite will inline assets (images, svgs) if they are below 4KiB
  See https://vite.dev/guide/assets#importing-asset-as-url

  These will be given as a Data URL string (supposedly base64 encoded, but I haven't seen that)
  Previously, we used the `svg-inline-loader` package and a Vite plugin, and all SVGs were
  inlined as raw XML text. This should still be the default option if separate loading is not preferred,
  so that CSS can target the (inner) SVG elements, <img> does not allow this.
 -->
<script lang="ts">
  import { onMount } from 'svelte';

  type Props = { icon: string | Object[] };
  let { icon }: Props = $props();
  const SVG_PREAMBLE = 'data:image/svg+xml,';
  const isInlinedIcon = $derived(typeof icon === 'string' && icon.startsWith(SVG_PREAMBLE));

  let svgSource = $state();
  onMount(async () => {
    if (typeof icon === 'string' && icon.endsWith('.svg')) {
      svgSource = await fetch(icon).then((r) => r.text());
    }
  });
</script>

{#if isInlinedIcon && typeof icon === 'string'}
  {@html decodeURIComponent(icon.replace(SVG_PREAMBLE, ''))}
{:else if svgSource}
  {@html svgSource}
{:else}
  <!-- ssr: use img as a fallback -->
  <img src={icon} alt="" />
{/if}
