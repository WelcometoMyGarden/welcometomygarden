<script>
  import { _, json } from 'svelte-i18n';
  import Collapsible from './Collapsible.svelte';
  import { supportEmailLinkString } from '@/util';

  export let i18nKey;

  let activeCollapsible = null;

  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div>
  {#each $json(i18nKey) as item, i}
    <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
      <h3 slot="title">{item.title}</h3>
      <p slot="content">
        {@html $_(`${i18nKey}.${i}.copy`, { values: { support: supportEmailLinkString } })}
      </p>
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
