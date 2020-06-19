<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '../components/CollapsibleGroup.svelte';
  import { getArrayFromLocale } from '@/util';
</script>

<div class="content">
  <div class="intro">
    <h2>{$_('rules.title')}</h2>
    <p>{$_('rules.description')}</p>
  </div>
  <CollapsibleGroup collapsibles={getArrayFromLocale('rules.rules')} />
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
