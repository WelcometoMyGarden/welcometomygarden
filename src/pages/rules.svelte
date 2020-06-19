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
    margin: 2rem 0;
    position: relative;
  }

  h2:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -1rem;
    border-radius: 1rem;
    background-color: var(--color-orange);
    width: 12rem;
    height: 0.3rem;
  }

  .rules {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    margin-top: 5rem;
  }

  @media (max-width: 700px) {
    h2:after {
      left: calc(50% - 6rem);
    }
    .content {
      text-align: center;
    }

    .rules {
      text-align: left;
    }
  }
</style>
