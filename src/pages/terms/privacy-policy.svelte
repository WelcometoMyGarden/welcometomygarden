<script>
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '@/util';
  import { Ol } from '@/components/UI';
</script>

<svelte:head>
  <title>{$_('privacy-policy.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>
  <div class="header">
    {$_('privacy-policy.title')}
    <small>{$_('privacy-policy.last-updated')}</small>
  </div>
  <p class="subtitle">{$_('privacy-policy.subtitle')}</p>
</h2>

<p>{$_('privacy-policy.intro')}</p>
<p>
  {@html $_('privacy-policy.email', { values: { support: supportEmailLinkString } })}
</p>

<Ol>
  <li class="h4">
    <h3 class="title t3">{$_('privacy-policy.scope.title')}</h3>
    <p>{$_('privacy-policy.scope.copy')}</p>
  </li>
  <li class="h4">
    <h3 class="title t3">{$_('privacy-policy.personal-data.meaning.title')}</h3>
    <p>{$_('privacy-policy.personal-data.meaning.copy')}</p>
  </li>
  <li class="h4">
    <h3 class="title t3">{$_('privacy-policy.personal-data.collection.title')}</h3>
    <p class="info">{$_('privacy-policy.personal-data.collection.copy')}</p>
    <Ol>
      {#each getNodeChildren('privacy-policy.personal-data.collection.sources') as sourcesKey}
        <li class="info-item p">
          <h4 class="title t4">
            {$_(`privacy-policy.personal-data.collection.sources.${sourcesKey}.title`)}
          </h4>
          <ul>
            {#each getNodeChildren(`privacy-policy.personal-data.collection.sources.${sourcesKey}.list`) as listKey}
              <li class="info-item p">
                {$_(
                  `privacy-policy.personal-data.collection.sources.${sourcesKey}.list.${listKey}`
                )}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </Ol>
  </li>
  <li class="h4">
    <h3 class="title t3">{$_('privacy-policy.personal-data.usage.title')}</h3>
    <p class="info">{$_('privacy-policy.personal-data.usage.subtitle')}</p>
    <ul>
      {#each getNodeChildren(`privacy-policy.personal-data.usage.purposes`) as purposesKey}
        <li class="info-item p">
          {$_(`privacy-policy.personal-data.usage.purposes.${purposesKey}`)}
        </li>
      {/each}
    </ul>
    <p>
      {@html $_('privacy-policy.personal-data.usage.copy')}
    </p>
  </li>
  {#each getNodeChildren(`privacy-policy.personal-data.extra`) as extraKey}
    <li class="h4">
      <h3 class="t3 title">
        {$_(`privacy-policy.personal-data.extra.${extraKey}.title`)}
      </h3>
      <p>{$_(`privacy-policy.personal-data.extra.${extraKey}.copy`)}</p>
    </li>
  {/each}
  <li class="h4">
    <h3 class="t3 title">{$_('privacy-policy.rights.title')}</h3>
    <p class="info p">{$_('privacy-policy.rights.copy')}</p>
    <Ol class="info-item">
      {#each getNodeChildren(`privacy-policy.rights.list`) as listKey}
        <li class="p">
          <h4 class="t4 title">{$_(`privacy-policy.rights.list.${listKey}.title`)}</h4>
          <p class="info-item">{$_(`privacy-policy.rights.list.${listKey}.copy`)}</p>
        </li>
      {/each}
    </Ol>
  </li>
  <li class="h4">
    <h3 class="title t3">{$_('privacy-policy.rights.exercise-rights.title')}</h3>
    <p>
      {@html $_('privacy-policy.rights.exercise-rights.copy', {
        values: { support: supportEmailLinkString }
      })}
    </p>
  </li>
</Ol>

<h3>{$_('privacy-policy.additional-info.title')}</h3>
{#each getNodeChildren(`privacy-policy.additional-info.infos`) as infosKey}
  <h4>{$_(`privacy-policy.additional-info.infos.${infosKey}.title`)}</h4>
  {#each getNodeChildren(`privacy-policy.additional-info.infos.${infosKey}.copy`) as copyKey}
    <p>{$_(`privacy-policy.additional-info.infos.${infosKey}.copy.${copyKey}`)}</p>
  {/each}
{/each}

<h3>{$_('privacy-policy.definitions.title')}</h3>
{#each getNodeChildren(`privacy-policy.definitions.articles`) as articlesKey}
  <h4>{$_(`privacy-policy.definitions.articles.${articlesKey}.title`)}</h4>
  <p>{$_(`privacy-policy.definitions.articles.${articlesKey}.copy`)}</p>
{/each}

<h4 class="info">{$_('privacy-policy.definitions.legal-info.title')}</h4>
<p class="info-item">{$_('privacy-policy.definitions.legal-info.copy')}</p>
<h4 class="info">
  {$_('privacy-policy.change-warning.title')}
  <small>{$_('privacy-policy.last-updated')}</small>
</h4>
<p class="info-item">{$_('privacy-policy.change-warning.copy')}</p>

<style>
  .subtitle {
    font-size: 1.6rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  h3:not(.t3) {
    padding-top: 2rem;
  }
</style>
