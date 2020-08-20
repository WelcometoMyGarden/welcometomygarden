<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';
  import { Ol } from '@/components/UI';

  $: articles = getArrayFromLocale('cookies.articles', $locale);
</script>

<svelte:head>
  <title>{$_('cookies.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>{$_('cookies.title')}</h2>
<Ol>
  {#each articles as { title, copy }, i}
    <li class="h3">
      <h3 class="title">{title}</h3>
      {#each getArrayFromLocale(`cookies.articles.${i}.copy`, $locale) as copy, j}
        <p>
          {@html $_(`cookies.articles.${i}.copy.${j}`, {
            values: { support: supportEmailLinkString }
          })}
        </p>
      {/each}
    </li>
  {/each}
</Ol>
