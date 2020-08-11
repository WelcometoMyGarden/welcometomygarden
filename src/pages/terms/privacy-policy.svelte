<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';

  $: definitions = getArrayFromLocale('privacy-policy.definitions.articles', $locale);
  $: personalDataCollected = getArrayFromLocale('privacy-policy.personal-data.collection.sources');
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

<ol>
  <li>
    <h4>{$_('privacy-policy.scope.title')}</h4>
    <p>{$_('privacy-policy.scope.copy')}</p>
  </li>
  <li>
    <h4>{$_('privacy-policy.personal-data.meaning.title')}</h4>
    <p>{$_('privacy-policy.personal-data.meaning.copy')}</p>
  </li>
  <li>
    <h4>{$_('privacy-policy.personal-data.collection.title')}</h4>
    <p class="info">{$_('privacy-policy.personal-data.collection.copy')}</p>
    <ol>
      {#each personalDataCollected as source}
        <li class="info-item">
          <h5>{source.title}</h5>
          <ul>
            {#each Array(Object.keys(source).length - 1) as _, i}
              <li class="info-item">{source[`list.${i}`]}</li>
            {/each}
          </ul>
        </li>
      {/each}
    </ol>
  </li>
  <li>
    <h4>{$_('privacy-policy.personal-data.usage.title')}</h4>
    <p class="info">{$_('privacy-policy.personal-data.usage.subtitle')}</p>
    <ul>
      {#each getArrayFromLocale('privacy-policy.personal-data.usage.purposes') as x, i}
        <li class="info-item">{$_(`privacy-policy.personal-data.usage.purposes.${i}`)}</li>
      {/each}
    </ul>
    <p>
      {@html $_('privacy-policy.personal-data.usage.copy')}
    </p>
  </li>
  {#each getArrayFromLocale('privacy-policy.personal-data.extra') as { title, copy }}
    <li>
      <h4>{title}</h4>
      <p>{copy}</p>
    </li>
  {/each}
  <li>
    <h4>{$_('privacy-policy.rights.title')}</h4>
    <p class="info">{$_('privacy-policy.rights.copy')}</p>
    <ol class="info-item">
      {#each getArrayFromLocale('privacy-policy.rights.list') as { title, copy }}
        <li>
          <h5>{title}</h5>
          <p class="info-item">{copy}</p>
        </li>
      {/each}
    </ol>
  </li>

  <li>
    <h4>{$_('privacy-policy.rights.exercise-rights.title')}</h4>
    <p>
      {@html $_('privacy-policy.rights.exercise-rights.copy', {
        values: { support: supportEmailLinkString }
      })}
    </p>
  </li>
</ol>

<h3>{$_('privacy-policy.additional-info.title')}</h3>
<ol>
  {#each getArrayFromLocale('privacy-policy.additional-info.infos') as item}
    <li>
      <h4>{item.title}</h4>
      {#each Array(Object.keys(item).length - 1) as x, i}
        <p>{item[`copy.${i}`]}</p>
      {/each}
    </li>
  {/each}
</ol>

<h3>{$_('privacy-policy.definitions.title')}</h3>
<ol>
  {#each definitions as { title, copy }}
    <li>
      <h4>{title}</h4>
      <p>{copy}</p>
    </li>
  {/each}

  <h4 class="info">{$_('privacy-policy.definitions.legal-info.title')}</h4>
  <p class="info-item">{$_('privacy-policy.definitions.legal-info.copy')}</p>
  <h4 class="info">
    {$_('privacy-policy.change-warning.title')}
    <small>{$_('privacy-policy.last-updated')}</small>
  </h4>
  <p class="info-item">{$_('privacy-policy.change-warning.copy')}</p>

</ol>

<style>
  .subtitle {
    font-size: 1.6rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  h3 {
    padding-top: 5rem;
  }
</style>
