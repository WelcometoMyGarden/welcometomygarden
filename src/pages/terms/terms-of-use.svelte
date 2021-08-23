<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import { Ol } from '@/components/UI';
</script>

<svelte:head>
  <title>{$_('terms-of-use.title')} | Welcome To My Garden</title>
</svelte:head>
<h2>
  {$_('terms-of-use.title')}
  <small>{$_('terms-of-use.last-updated')}</small>
</h2>
{#each getNodeChildren('terms-of-use.intro') as introKey}
  <p>
    {@html $_(`terms-of-use.intro.${introKey}.copy`, {
      values: { support: supportEmailLinkString }
    })}
  </p>
{/each}
<div class="line-break" />
<Ol>
  {#each getNodeChildren('terms-of-use.articles') as articleKey}
    <li class="h3">
      <h3 class="title">
        {@html $_(`terms-of-use.articles.${articleKey}.title`)}
      </h3>
      {#each getNodeChildren(`terms-of-use.articles.${articleKey}.descriptions`) as descriptionKey}
        <p>
          {@html $_(`terms-of-use.articles.${articleKey}.descriptions.${descriptionKey}.copy`, {
            values: { support: supportEmailLinkString }
          })}
        </p>
      {/each}
      {#each getNodeChildren(`terms-of-use.articles.${articleKey}.info`) as infoKey}
        <p class="info">
          {@html $_(`terms-of-use.articles.${articleKey}.info.${infoKey}.title`)}
        </p>
        <Ol>
          {#each getNodeChildren(`terms-of-use.articles.${articleKey}.info.${infoKey}.sections`) as sectionsKey}
            <li class="info-item h4">
              <h4 class="title">
                {@html $_(
                  `terms-of-use.articles.${articleKey}.info.${infoKey}.sections.${sectionsKey}.title`
                )}
              </h4>
              <p>
                {@html $_(
                  `terms-of-use.articles.${articleKey}.info.${infoKey}.sections.${sectionsKey}.copy`
                )}
              </p>
            </li>
          {/each}
        </Ol>
      {/each}
      <Ol>
        {#each getNodeChildren(`terms-of-use.articles.${articleKey}.paragraphs`) as paragraphsKey}
          <li class="h4">
            <h4 class="title">
              {@html $_(`terms-of-use.articles.${articleKey}.paragraphs.${paragraphsKey}.title`)}
            </h4>
            {#each getNodeChildren(`terms-of-use.articles.${articleKey}.paragraphs.${paragraphsKey}.copy`) as copyKey}
              <p>
                {@html $_(
                  `terms-of-use.articles.${articleKey}.paragraphs.${paragraphsKey}.copy.${copyKey}`
                )}
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
