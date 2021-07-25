<script>
  import { _, json } from 'svelte-i18n';
  import { supportEmailLinkString } from '@/util';
  import { Ol } from '@/components/UI';
</script>

<svelte:head>
  <title>{$_('cookies.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>{$_('cookies.title')}</h2>
<Ol>
  {#each $json('cookies.articles') as { title, copy }, i}
    <li class="h3">
      <h3 class="title">{title}</h3>
      {#each $json(`cookies.articles.${i}.copy`) as copy, j}
        <p>
          {@html $_(`cookies.articles.${i}.copy.${j}`, {
            values: { support: supportEmailLinkString }
          })}
        </p>
      {/each}
    </li>
  {/each}
</Ol>
