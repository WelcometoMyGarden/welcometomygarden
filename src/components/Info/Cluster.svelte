<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import Collapsible from '../../components/Collapsible.svelte';

  export let clusterKey;

  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div />
<div class="cluster">
  <div class="title">
    <h3>{$_(`${clusterKey}.title`)}</h3>
  </div>

  <div class="cluster-collapsible">
    {#each getNodeChildren(`${clusterKey}.questions`) as key, i}
      <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
        <h4 slot="title">{$_(`${clusterKey}.questions.${key}.title`)}</h4>
        <p slot="content">
          {@html $_(`${clusterKey}.questions.${key}.copy`, {
            values: {
              support: supportEmailLinkString
            }
          })}
        </p>
      </Collapsible>
    {/each}
  </div>
</div>

<style>
  .cluster {
    margin-bottom: 3rem;
  }

  .cluster .title {
    background: var(--color-green-light);
    border-radius: 1.2rem 1.2rem 0 0;
    box-shadow: 0 0 3.3rem rgb(0 0 0 / 10%);
  }

  .cluster .title h3 {
    font-size: 2rem;
    padding: 2.4rem 4.8rem;
  }

  .cluster-collapsible {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }
</style>
