<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import Collapsible from '../../components/Collapsible.svelte';
  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
  let collapsibleKey = 'faq.questions';
</script>

<svelte:head>
  <title>{$_('generics.faq.acronym')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>

<div class="collapsible-faq">
  {#each getNodeChildren(collapsibleKey) as key, i}
    <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
      <h3 slot="title">{$_(`${collapsibleKey}.${key}.title`)}</h3>
      <p slot="content">
        {@html $_(`${collapsibleKey}.${key}.copy`, {
          values: {
            support: supportEmailLinkString
          }
        })}
      </p>
    </Collapsible>
  {/each}
</div>

<style>
  .collapsible-faq {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }
</style>
