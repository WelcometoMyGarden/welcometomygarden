<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';

  $: articles = getArrayFromLocale('cookies.articles');
</script>

<svelte:head>
  <title>{$_('cookies.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>{$_('cookies.title')}</h2>
{#each articles as { title, copy }, i}
  <h3>{title}</h3>
  {#each getArrayFromLocale(`cookies.articles.${i}.copy`) as copy, j}
    <p>
      {@html $_(`cookies.articles.${i}.copy.${j}`, { values: { support: supportEmailLinkString } })}
    </p>
  {/each}
{/each}
