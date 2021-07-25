<script>
  import { _, json } from 'svelte-i18n';
  import { supportEmailLinkString } from '@/util';
  import { Ol } from '@/components/UI';

  $: getJson = (key) => {
    const value = $json(key);
    return Array.isArray(value) ? value : [];
  };
</script>

<svelte:head>
  <title>{$_('terms-of-use.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>
  {$_('terms-of-use.title')}
  <small>{$_('terms-of-use.last-updated')}</small>
</h2>
{#each getJson('terms-of-use.intro') as item, i}
  <p>
    {@html $_(`terms-of-use.intro.${i}.copy`, { values: { support: supportEmailLinkString } })}
  </p>
{/each}
<div class="line-break" />
<Ol>
  {#each getJson('terms-of-use.articles') as article, i}
    <li class="h3">
      <h3 class="title">
        {@html $_(`terms-of-use.articles.${i}.title`)}
      </h3>
      {#each getJson(`terms-of-use.articles.${i}.descriptions`) as description, j}
        <p>
          {@html $_(`terms-of-use.articles.${i}.descriptions.${j}.copy`, {
            values: { support: supportEmailLinkString }
          })}
        </p>
      {/each}
      {#each getJson(`terms-of-use.articles.${i}.info`) as information, k}
        <p class="info">
          {@html $_(`terms-of-use.articles.${i}.info.${k}.title`)}
        </p>
        <Ol>
          {#each getJson(`terms-of-use.articles.${i}.info.${k}.sections`) as section, l}
            <li class="info-item h4">
              <h4 class="title">
                {@html $_(`terms-of-use.articles.${i}.info.${k}.sections.${l}.title`)}
              </h4>
              <p>
                {@html $_(`terms-of-use.articles.${i}.info.${k}.sections.${l}.copy`)}
              </p>
            </li>
          {/each}
        </Ol>
      {/each}
      <Ol>
        {#each getJson(`terms-of-use.articles.${i}.paragraphs`) as paragraph, m}
          <li class="h4">
            <h4 class="title">
              {@html $_(`terms-of-use.articles.${i}.paragraphs.${m}.title`)}
            </h4>
            {#each getJson(`terms-of-use.articles.${i}.paragraphs.${m}.copy`) as copy, n}
              <p>
                {@html $_(`terms-of-use.articles.${i}.paragraphs.${m}.copy.${n}`)}
              </p>
            {/each}
          </li>
        {/each}
      </Ol>
    </li>
    <div class="line-break" />
  {/each}
</Ol>

<style>
  h2 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
</style>
