<script>
  import { _, locale } from 'svelte-i18n';
  import Collapsible from '../components/Collapsible.svelte';
  import { getArrayFromLocale } from '@/util';

  let activeCollapsible = null;
  const setActiveCollapsible = id => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div class="content">
  <h2>{$_('rules.title')}</h2>
  <div class="title-line-break" />
  <p>{$_('rules.description')}</p>
  <div class="rules">
    {#each getArrayFromLocale('rules.rules') as rule, i}
      <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
        <h3 slot="title">{rule.title}</h3>
        <p slot="content">{rule.body}</p>
      </Collapsible>
    {/each}
  </div>
</div>

<style>
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 90rem;
    margin: 0 auto;
  }

  h2 {
    font-size: 2.4rem;
    margin: 1.6rem 0;
  }

  .title-line-break {
    border-bottom: 0.3rem solid var(--color-orange);
    max-width: 12rem;
    margin: 0.4rem 0 2.4rem 0;
  }

  .rules {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }
</style>
