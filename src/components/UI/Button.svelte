<script>
  import Text from './Text.svelte';

  export let type = null;
  export let href = null;
  export let capitalize = false;
  export let primary = false;
  export let loading = false;

  export let target = null;

  let className = `button ${primary && 'primary'}`;
</script>

{#if href}
  <a
    class={className}
    class:capitalize
    class:is-primary={primary}
    class:is-loading={loading}
    {href}
    {target}>
    <Text is="span">
      <slot />
    </Text>
  </a>
{:else}
  <button
    class={className}
    class:capitalize
    class:is-primary={primary}
    class:is-loading={loading}
    {type}>
    <Text is="span" weight="bold">
      <slot />
    </Text>
  </button>
{/if}

<style type="text/scss">
  @import '../../style/variables';

  .capitalize {
    text-transform: uppercase;
  }

  a.button {
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }

  button.button {
    background-color: $color-bg-dark;
    border: 2px solid $color-bg-dark;
    border-radius: $radius-s;
    padding: $spacer-m $spacer-l;
    color: white;
    cursor: pointer;
    box-sizing: border-box;

    &:hover,
    &:active,
    &:focus {
      background-color: transparent;
      color: $color-text;
    }
  }
</style>
