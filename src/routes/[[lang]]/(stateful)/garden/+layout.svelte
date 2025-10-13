<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { hasLoaded as gardenHasLoaded } from '$lib/stores/garden';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { auth } from '$lib/api/firebase';
  // Due to the root layout guard, we can assume here that the app has loaded.
  // This means user-public & user-private properties were also loaded,
  // but it does not necessarily mean that the garden finished loading.

  $: route = $page.url.pathname;

  /** SvelteKit's own $navigating does not work well here
   * A "goto" somehow triggers a rerun of this code with $navigating still being null
   */
  let navigating = false;
  let reloadedOnce = false;
  $: if (navigating) {
    // Don't do anything, prevent reruns of the code below while navigating
  } else if (!$user) {
    notify.info($_('auth.unsigned'), 8000);
    goto(`${routes.SIGN_IN}?continueUrl=${encodeURIComponent(route ?? '')}`);
  } else if (!$user.emailVerified && !reloadedOnce) {
    // TODO: leverage the top notice to not take the user out of the flow?
    // Alternatively, also implement the verification thing continue URL (but
    // that's less intuitive)
    // Try reloading the user to make sure it is indeed not verified.
    console.debug('Reloading user because it was unverified');
    // Prevent an infinite loop; reload will always update the reactive $user
    reloadedOnce = true;
    auth().currentUser?.reload();
  } else if (!$user.emailVerified && reloadedOnce && !navigating) {
    // Intended for when this page is loaded directly as a logged-in, email-unverified user
    notify.info($_('auth.verification.unverified'), 8000);
    navigating = true;
    goto(routes.ACCOUNT);
  } else if ($gardenHasLoaded) {
    if (!!$user.garden && route == routes.ADD_GARDEN) {
      // Garden already exists, silently go to the "Manage garden" page
      goto(routes.MANAGE_GARDEN);
    } else if (!$user.garden && route === routes.MANAGE_GARDEN) {
      // Garden does not yet exist, go to the "Add garden" page
      notify.warning($_('garden.manage.add-first'));
      goto(routes.ADD_GARDEN);
    }
  }
</script>

{#if $gardenHasLoaded}
  <slot />
{/if}
