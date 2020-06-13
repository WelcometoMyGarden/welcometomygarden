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

<style>
  .capitalize {
    text-transform: uppercase;
  }

  a.button {
    text-decoration: none;
    display: inline-block;
    cursor: pointer;
  }

  button.button {
    background-color: var(--color-green);
    border: 2px solid var(--color-green);
    border-radius: var(--radius-s);
    padding: var(--spacer-m) var(--spacer-l);
    color: white;
    cursor: pointer;
    box-sizing: border-box;
  }

  button.button:hover,
  button.button:active,
  button.button:focus {
    background-color: transparent;
    color: var(--color-green);
  }
</style>
