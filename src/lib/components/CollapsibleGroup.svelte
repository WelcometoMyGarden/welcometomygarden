<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { getNodeChildren } from '$lib/util';
  import Collapsible from './Collapsible.svelte';

  export let collapsibleKey: string;

  let activeCollapsible: number | null = null;

  /**
   * If the given collapsible is already active, deactivate it. Otherwise, activate it.
   */
  const toggleCollapsible = (id: number) => {
    activeCollapsible = activeCollapsible === id ? null : id;
  };
</script>

<div>
  {#each getNodeChildren(collapsibleKey) as key, i}
    <Collapsible on:click={() => toggleCollapsible(i)} open={activeCollapsible === i}>
      <h3 class="oh3" slot="title">{$_(`${collapsibleKey}.${key}.title`)}</h3>
      <p slot="content">{@html $_(`${collapsibleKey}.${key}.copy`)}</p>
    </Collapsible>
  {/each}
</div>

<style>
  div {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  p :global(a),
  p :global(a:visited),
  p :global(a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }

  p :global(a:hover) {
    text-decoration: none;
  }

  p :global(ul) {
    list-style-type: unset;
    list-style-position: inside;
  }
</style>
