<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { getNodeChildren, supportEmailLinkString } from '$lib/util';
  import Collapsible from './Collapsible.svelte';
  import { COMMUNITY_TRANSLATIONS_URL, DONATION_URL } from '$lib/constants';
  import routes from '$lib/routes';
  import { anchorText, lr } from '$lib/util/translation-helpers';

  interface Props {
    collapsibleKey: string;
  }

  let { collapsibleKey }: Props = $props();

  let activeCollapsible: number | null = $state(null);

  /**
   * If the given collapsible is already active, deactivate it. Otherwise, activate it.
   */
  const toggleCollapsible = (id: number) => {
    activeCollapsible = activeCollapsible === id ? null : id;
  };
</script>

<div>
  {#each getNodeChildren(collapsibleKey) as key, i}
    <Collapsible onclick={() => toggleCollapsible(i)} open={activeCollapsible === i}>
      {#snippet title()}
        <h3 class="oh3">{@html $_(`${collapsibleKey}.${key}.title`)}</h3>
      {/snippet}
      {#snippet content()}
        <p>
          {@html $_(`${collapsibleKey}.${key}.copy`, {
            values: {
              // Note: copy pasted from src/lib/components/Info/Clusters.svelte
              // There might be an opportunity to refactor this
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

<style>
  div {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  p :global(a),
  p :global(a:visited),
  p :global(a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }

  p :global(a:hover) {
    text-decoration: none;
  }

  p :global(ul) {
    list-style-type: unset;
    list-style-position: inside;
  }
</style>
