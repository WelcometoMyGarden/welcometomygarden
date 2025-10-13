<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
</script>

<svelte:head>
  <title>{$_('generics.rules')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<div class="intro">
  <h2>{$_('rules.title')}</h2>
  <p>{@html $_('rules.description')}</p>
</div>

<div class="rules-content"><CollapsibleGroup collapsibleKey={'rules.rules'} /></div>

<style>
  .rules-content :global(ul) {
    list-style-position: outside;
  }
  .rules-content :global(li) {
    margin: 0.5rem 0 0 1.5rem;
  }
</style>
