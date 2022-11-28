<script>
  import { _ } from 'svelte-i18n';
  import Clusters from '$lib/components/Info/Clusters.svelte';

  let clustersKey = 'faq.clusters';
</script>

<svelte:head>
  <title>{$_('generics.faq.acronym')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>

<Clusters {clustersKey} />
