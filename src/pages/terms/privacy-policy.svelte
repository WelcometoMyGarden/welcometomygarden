<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';
  import { Ol } from '@/components/UI';

  $: definitions = getArrayFromLocale('privacy-policy.definitions.articles', $locale);
  $: personalDataCollected = getArrayFromLocale(
    'privacy-policy.personal-data.collection.sources',
    $locale
  );
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
      {#each personalDataCollected as source}
        <li class="info-item p">
          <h4 class="title t4">{source.title}</h4>
          <ul>
            {#each Array(Object.keys(source).length - 1) as _, i}
              <li class="info-item p">{source[`list.${i}`]}</li>
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
      {#each getArrayFromLocale('privacy-policy.personal-data.usage.purposes') as x, i}
        <li class="info-item p">{$_(`privacy-policy.personal-data.usage.purposes.${i}`)}</li>
      {/each}
    </ul>
    <p>
      {@html $_('privacy-policy.personal-data.usage.copy')}
    </p>
  </li>
  {#each getArrayFromLocale('privacy-policy.personal-data.extra', $locale) as { title, copy }}
    <li class="h4">
      <h3 class="t3 title">{title}</h3>
      <p>{copy}</p>
    </li>
  {/each}
  <li class="h4">
    <h3 class="t3 title">{$_('privacy-policy.rights.title')}</h3>
    <p class="info p">{$_('privacy-policy.rights.copy')}</p>
    <Ol class="info-item">
      {#each getArrayFromLocale('privacy-policy.rights.list', $locale) as { title, copy }}
        <li class="p">
          <h4 class="t4 title">{title}</h4>
          <p class="info-item">{copy}</p>
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
{#each getArrayFromLocale('privacy-policy.additional-info.infos', $locale) as item}
  <h4>{item.title}</h4>
  {#each Array(Object.keys(item).length - 1) as x, i}
    <p>{item[`copy.${i}`]}</p>
  {/each}
{/each}

<h3>{$_('privacy-policy.definitions.title')}</h3>
{#each definitions as { title, copy }}
  <h4>{title}</h4>
  <p>{copy}</p>
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
