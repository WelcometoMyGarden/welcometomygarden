<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import Cluster from '../../components/Info/Cluster.svelte';

  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };

  let clustersKey = 'faq.clusters';
</script>

<svelte:head>
  <title>{$_('generics.faq.acronym')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>

{#each getNodeChildren(clustersKey) as key, i}
  <Cluster clusterKey={`${clustersKey}.${key}`} />
{/each}
