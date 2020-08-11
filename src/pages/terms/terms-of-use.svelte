<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';

  $: intro = getArrayFromLocale('terms-of-use.intro', $locale);
  $: articles = getArrayFromLocale('terms-of-use.articles', $locale);
</script>

<svelte:head>
  <title>{$_('terms-of-use.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>
  {$_('terms-of-use.title')}
  <small>{$_('terms-of-use.last-updated')}</small>
</h2>
{#each intro as item, i}
  <p>
    {@html $_(`terms-of-use.intro.${i}.copy`, { values: { support: supportEmailLinkString } })}
  </p>
{/each}
<div class="line-break" />
{#each articles as article, i}
  <h3>
    <!-- {i + 1}. -->
    {@html $_(`terms-of-use.articles.${i}.title`)}
  </h3>
  {#each getArrayFromLocale(`terms-of-use.articles.${i}.descriptions`, $locale) as description, j}
    <p>
      {@html $_(`terms-of-use.articles.${i}.descriptions.${j}.copy`, {
        values: { support: supportEmailLinkString }
      })}
    </p>
  {/each}
  {#each getArrayFromLocale(`terms-of-use.articles.${i}.info`, $locale) as information, k}
    <p class="info">
      <!-- {i + 1}.{k + 1}. -->
      {@html $_(`terms-of-use.articles.${i}.info.${k}.title`)}
    </p>
    <ol>
      {#each getArrayFromLocale(`terms-of-use.articles.${i}.info.${k}.sections`, $locale) as section, l}
        <li class="info-item">
          <h4>
            <!-- {i + 1}.{k + 1}.{l + 1}. -->
            {@html $_(`terms-of-use.articles.${i}.info.${k}.sections.${l}.title`)}
          </h4>
          <p>
            {@html $_(`terms-of-use.articles.${i}.info.${k}.sections.${l}.copy`)}
          </p>
        </li>
      {/each}
    </ol>
  {/each}
  <ol>
    {#each getArrayFromLocale(`terms-of-use.articles.${i}.paragraphs`, $locale) as paragraph, m}
      <li>
        <h4>
          <!-- {i + 1}.{m + 1}. -->
          {@html $_(`terms-of-use.articles.${i}.paragraphs.${m}.title`)}
        </h4>
        {#each getArrayFromLocale(`terms-of-use.articles.${i}.paragraphs.${m}.copy`, $locale) as copy, n}
          <p>
            {@html $_(`terms-of-use.articles.${i}.paragraphs.${m}.copy.${n}`)}
          </p>
        {/each}
      </li>
    {/each}
  </ol>
  <div class="line-break" />
{/each}

<style>
  h2 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
</style>
