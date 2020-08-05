<script>
  import { _, locale } from 'svelte-i18n';
  import { getArrayFromLocale, supportEmailLinkString } from '@/util';
</script>

<svelte:head>
  <title>{$_('cookies.title')} | Welcome To My Garden</title>
</svelte:head>

<h2>{$_('cookies.title')}</h2>
<h3>{$_('cookies.articles.1.title')}</h3>
<p>
  {@html $_('cookies.articles.1.copy')}
</p>
<h3>{$_('cookies.articles.2.title')}</h3>
<p>{$_('cookies.articles.2.copy')}</p>

<h3>{$_('cookies.articles.3.title')}</h3>
<p>
  {@html $_('cookies.articles.3.copy')}
</p>
<h3>{$_('cookies.articles.4.title')}</h3>
<p>{$_(`cookies.articles.4.copy.p1`)}</p>
<p>{$_(`cookies.articles.4.copy.p2`)}</p>
<p>{$_(`cookies.articles.4.copy.p3`)}</p>
<p>{$_(`cookies.articles.4.copy.p4`)}</p>
<p>{$_(`cookies.articles.4.copy.p5`)}</p>

<h3>{$_('cookies.articles.5.title')}</h3>
<p>{$_(`cookies.articles.5.copy.p1`)}</p>
<p>{$_(`cookies.articles.5.copy.p2`)}</p>
<p>
  {@html $_(`cookies.articles.5.copy.p3`)}
</p>
<p>{$_(`cookies.articles.5.copy.p4`)}</p>

<h3>{$_('cookies.articles.6.title')}</h3>
<p>
  {@html $_('cookies.articles.6.copy', { values: { support: supportEmailLinkString } })}
</p>
