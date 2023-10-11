<script lang="ts">
  import { shareIcon, burgerIcon, plusSquareIcon, threeDotsIcon } from '$lib/images/icons';
  import { uaInfo } from '$lib/util/uaInfo';
  import instantiateComponents, { ClientIcon } from '$lib/util/dynamicComponents';
  import { anchorText } from '$lib/util/translation-helpers';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  const { browser } = uaInfo!;
  const lowerCaseBrowserName = (
    ['Chrome', 'Firefox', 'Safari'].map((s) => 'Mobile ' + s).includes(browser.name || '')
      ? browser.name!
      : // default
        'Mobile Safari'
  )
    .split(' ')[1]
    .toLowerCase();

  onMount(() => {
    // might be nicer on a higher level, but on those onMounts, we're not fully loaded yet here...
    instantiateComponents();
  });
</script>

<ol class="outer">
  <li>
    <span>{$_('push-notifications.how-to.ios-browser-steps.1')}</span>
    <ol class="inner">
      {@html $_(`push-notifications.how-to.ios-browser-steps.1-${lowerCaseBrowserName}`, {
        values: {
          burgerIcon: ClientIcon(burgerIcon),
          shareIcon: ClientIcon(shareIcon),
          threeDotsIcon: ClientIcon(threeDotsIcon),
          plusSquareIcon: ClientIcon(plusSquareIcon)
        }
      })}
    </ol>
  </li>
  <li><span>{$_('push-notifications.how-to.ios-browser-steps.2')}</span></li>
  <li><span>{$_('push-notifications.how-to.ios-browser-steps.3')}</span></li>
</ol>
<p>
  {@html $_('push-notifications.how-to.questions', {
    values: {
      guideLink: anchorText({
        href: $_('push-notifications.prompt.helpcenter-url'),
        linkText: $_('push-notifications.how-to.questions-link-text'),
        class: 'link'
      })
    }
  })}
</p>

<style>
  ol.outer {
    list-style: decimal;
    margin-top: 1rem;
    margin-left: 2.2rem;
  }

  ol.inner {
    list-style: lower-alpha;
    list-style-position: inside;
  }
  li {
    margin-bottom: 1rem;
  }
  li > span {
    font-weight: 600;
  }
  ol.outer :global(em) {
    font-weight: 500;
  }
</style>
