<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/state';
  import ErrorTemplate from '$lib/components/ErrorTemplate.svelte';
  import { user } from '$lib/stores/auth';
  import routes from '$lib/routes';
  import { lr, anchorText } from '$lib/util/translation-helpers';
  import { emailAsLink } from '$lib/constants';
  import { questionMarkIcon } from '$lib/images/icons';

  /**
   * This works because it is a stateful descendant page
   */
  let email = $derived(page.url.searchParams.get('email') ?? '');

  // Once the user is loaded, decide which follow-up action to present.
  const showAccountLink = $derived(!!email && $user?.email === email);
  const showSignInLink = $derived(!showAccountLink);

  const accountLink = $derived(
    anchorText({
      href: $lr(routes.ACCOUNT),
      linkText: $_('manage-membership-error.account-link-text'),
      newtab: false
    })
  );

  const signInLink = $derived(
    anchorText({
      href: `${$lr(routes.SIGN_IN)}?continueUrl=${encodeURIComponent($lr(routes.ACCOUNT))}`,
      linkText: $_('manage-membership-error.sign-in-link-text'),
      newtab: false
    })
  );

  const title = { key: 'generics.error.start' };
</script>

<svelte:head>
  <title>{$_(title.key)} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<ErrorTemplate {title} icon={questionMarkIcon}>
  {#if showAccountLink}
    <p>
      {@html $_('manage-membership-error.logged-in', {
        values: { accountLink, support: emailAsLink }
      })}
    </p>
  {:else if showSignInLink}
    <p>
      {@html $_('manage-membership-error.logged-out', { values: { email, signInLink } })}
    </p>
  {/if}
</ErrorTemplate>
