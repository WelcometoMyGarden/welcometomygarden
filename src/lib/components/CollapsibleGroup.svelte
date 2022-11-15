<script>
  import { _ } from 'svelte-i18n';
  import { getNodeChildren } from '$lib/util';
  import Collapsible from './Collapsible.svelte';

  export let collapsibleKey;

  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div>
  {#each getNodeChildren(collapsibleKey) as key, i}
    <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
      <h3 slot="title">{$_(`${collapsibleKey}.${key}.title`)}</h3>
      <p slot="content">{$_(`${collapsibleKey}.${key}.copy`)}</p>
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
</style>
