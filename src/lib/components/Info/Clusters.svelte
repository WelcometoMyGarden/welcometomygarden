<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { supportEmailLinkString, getNodeChildren } from '$lib/util';
  import Collapsible from '../../components/Collapsible.svelte';
  import { DONATION_URL, COMMUNITY_TRANSLATIONS_URL } from '$lib/constants';
  import routes from '$lib/routes';
  import { anchorText, lr } from '$lib/util/translation-helpers';

  let { clustersKey } = $props();

  let activeCollapsible = $state(null);
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

{#each getNodeChildren(clustersKey) as clusterKey}
  <div class="cluster">
    <div class="title">
      <h3>{$_(`${clustersKey}.${clusterKey}.title`)}</h3>
    </div>

    <div class="cluster-collapsible">
      {#each getNodeChildren(`${clustersKey}.${clusterKey}.questions`) as questionKey}
        <Collapsible
          onclick={() => setActiveCollapsible(`${clusterKey}-${questionKey}`)}
          open={activeCollapsible === `${clusterKey}-${questionKey}`}
        >
          {#snippet title()}
            <h4>
              {@html $_(`${clustersKey}.${clusterKey}.questions.${questionKey}.title`)}
            </h4>
          {/snippet}
          {#snippet content()}
            <p>
              {@html $_(`${clustersKey}.${clusterKey}.questions.${questionKey}.copy`, {
                values: {
                  support: supportEmailLinkString,
                  donationLink: `<a href="${DONATION_URL}" target="_blank" class="link">
                    ${$_('faq.donation')}</a>`,
                  chatLink: `<a href="${$lr(routes.CHAT)}" target="_blank" class="link lowercase">
                    ${$_('generics.chat')}</a>`,
                  accountLink: `<a href="${$lr(routes.ACCOUNT)}" target="_blank" class="link lowercase">
                    ${$_('generics.account-page')}</a>`,
                  communityTranslationsLink: `<a href="${COMMUNITY_TRANSLATIONS_URL}" target="_blank" rel="noreferrer" class="link lowercase">
                    ${$_('faq.instruction-page')}</a>`,
                  mobileFaqLink: anchorText({
                    href: $_('push-notifications.prompt.helpcenter-url'),
                    linkText: $_('faq.help-center-text')
                  }),
                  langPrefix: $_('generics.lang-prefix', {
                    // the empty string prefix is valid here
                    default: ''
                  })
                }
              })}
            </p>
          {/snippet}
        </Collapsible>
      {/each}
    </div>
  </div>
{/each}

<style>
  .cluster {
    margin-bottom: 3rem;
  }

  .cluster .title {
    background: var(--color-green-light);
    border-radius: 1.2rem 1.2rem 0 0;
    box-shadow: 0 0 3.3rem rgb(0 0 0 / 10%);
  }

  .cluster .title h3 {
    font-size: 2rem;
    padding: 2.4rem 4.8rem;
  }

  .cluster-collapsible {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  .cluster :global(.lowercase) {
    text-transform: lowercase;
  }

  .cluster-collapsible p :global(a:link),
  .cluster-collapsible p :global(a:visited),
  .cluster-collapsible p :global(a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }
  .cluster-collapsible p :global(a:hover) {
    text-decoration: none;
  }
  .cluster-collapsible :global(ul) {
    list-style-type: disc;
    list-style-position: outside;
  }
  /* Similar to the style in src/routes/(static)/info/rules/+page.svelte */
  .cluster-collapsible :global(li) {
    margin: 0.5rem 0 0 1.5rem;
  }
</style>
