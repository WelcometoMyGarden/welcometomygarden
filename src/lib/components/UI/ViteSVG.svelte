<!-- @component
  Vite will inline assets (images, svgs) if they are below 4KiB
  See https://vite.dev/guide/assets#importing-asset-as-url

  These will be given as a Data URL string (supposedly base64 encoded, but I haven't seen that)
  Previously, we used the `svg-inline-loader` package and a Vite plugin, and all SVGs were
  inlined as raw XML text. This should still be the default option if separate loading is not preferred,
  so that CSS can target the (inner) SVG elements, <img> does not allow this.
 -->
<script lang="ts">
  import Spinner from './Spinner.svelte';

  type Props = {
    icon: string | Object[];
    placeholderWidth?: string;
    placeholderHeight?: string;
    placeholderColor?: string;
  };
  let {
    icon,
    placeholderWidth = '100px',
    placeholderHeight = '100px',
    placeholderColor
  }: Props = $props();
  const SVG_PREAMBLE = 'data:image/svg+xml,';
  const isInlinedSVG = $derived(typeof icon === 'string' && icon.startsWith(SVG_PREAMBLE));
  // The icon string ends with .svg and an optional ?t=\d+ query paramter for the Vite dev server
  const isSVGURL = $derived(typeof icon === 'string' && /\.svg(?:\?t=\d+)?$/.test(icon));

  let isFetchingFromNetwork = $state(false);
  let fetchedSVGSource = $state();

  $effect(() => {
    // Note: the icon property might change, therefore, we fetch in $effect
    // and not in onMount
    if (isSVGURL && typeof icon === 'string') {
      isFetchingFromNetwork = true;
      fetch(icon)
        .then((r) => r.text())
        .then((r) => {
          fetchedSVGSource = r;
        })
        .finally(() => (isFetchingFromNetwork = false));
    }
  });
</script>

{#if isInlinedSVG && typeof icon === 'string'}
  <!-- Render the URL-encoded inlined SVG as a <svg> elemeent -->
  {@html decodeURIComponent(icon.replace(SVG_PREAMBLE, ''))}
{:else if isFetchingFromNetwork}
  <!-- Render loading UI -->
  <div style:height={placeholderHeight} style:width={placeholderWidth}>
    <Spinner color={placeholderColor} />
  </div>
{:else if fetchedSVGSource}
  <!-- Render the fetched result -->
  {@html fetchedSVGSource}
{:else}
  <!-- On SSR and initial mount: use img as a fallback with the icon URL -->
  <img src={icon as string} alt="" />
{/if}

<style>
  div {
    position: relative;
  }
</style>
