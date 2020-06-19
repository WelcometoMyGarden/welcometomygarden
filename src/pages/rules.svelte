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
  <div class="intro">
    <h2>{$_('rules.title')}</h2>
    <p>{$_('rules.description')}</p>
  </div>
  <div class="rules">
    {#each getArrayFromLocale('rules.rules') as { title, body }, i}
      <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
        <h3 slot="title">{title}</h3>
        <p slot="content">{body}</p>
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
    margin: 2rem 0 3rem;
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

  @media (max-width: 920px) {
    .intro {
      padding: 0 4rem;
      text-align: center;
    }

    h2:after {
      left: calc(50% - 6rem);
    }
  }
</style>
