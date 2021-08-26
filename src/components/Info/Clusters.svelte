<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import Collapsible from '../../components/Collapsible.svelte';
  import { DONATION_URL } from '../../constants';

  export let clustersKey;

  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

{#each getNodeChildren(clustersKey) as clusterKey}
  <div class="cluster">
    <div class="title">
      <h3>{$_(`${clustersKey}.${clusterKey}.title`)}</h3>
    </div>

    <div class="cluster-collapsible">
      {#each getNodeChildren(`${clustersKey}.${clusterKey}.questions`) as questionKey}
        <Collapsible
          on:click={() => setActiveCollapsible(`${clusterKey}-${questionKey}`)}
          open={activeCollapsible === `${clusterKey}-${questionKey}`}
        >
          <h4 slot="title">{$_(`${clustersKey}.${clusterKey}.questions.${questionKey}.title`)}</h4>
          <p slot="content">
            {@html $_(`${clustersKey}.${clusterKey}.questions.${questionKey}.copy`, {
              values: {
                support: supportEmailLinkString,
                donationLink: `</span><a href="${DONATION_URL}" target="_blank" rel="noopener noreferrer" class="link">${$_(
                  'faq.donation'
                )}</a>`
              }
            })}
          </p>
        </Collapsible>
      {/each}
    </div>
  </div>
{/each}

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
