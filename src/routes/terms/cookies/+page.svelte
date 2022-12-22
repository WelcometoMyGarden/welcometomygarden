<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '$lib/util';
  import { Ol } from '$lib/components/UI';
</script>

<svelte:head>
  <title>{$_('cookies.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<h2>{$_('cookies.title')}</h2>
<Ol>
  {#each getNodeChildren('cookies.articles') as key}
    <li class="h3">
      <h3 class="title">{$_(`cookies.articles.${key}.title`)}</h3>
      {#each getNodeChildren(`cookies.articles.${key}.copy`) as copyKey}
        <p>
          {@html $_(`cookies.articles.${key}.copy.${copyKey}`, {
            values: { support: supportEmailLinkString }
          })}
        </p>
      {/each}
    </li>
  {/each}
</Ol>
