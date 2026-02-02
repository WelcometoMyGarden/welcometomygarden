<script lang="ts">
  import MarketingStyleWrapper from '$lib/components/Marketing/MarketingStyleWrapper.svelte';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<MarketingStyleWrapper>
  {@render children?.()}
</MarketingStyleWrapper>
