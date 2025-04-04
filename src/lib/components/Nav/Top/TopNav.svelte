<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import NavLink from './NavLink.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { user } from '$lib/stores/auth';
  import WtmgLogo from '../../UI/WTMGLogo.svelte';
  import { COMMUNITY_FORUM_URL } from '$lib/constants';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import trackEvent from '$lib/util/track-plausible';
  import { renewalNoticeContent, subscriptionJustEnded } from '$lib/stores/subscription';

  $: firstName = $user ? $user.firstName : '';
  $: shouldShowRenewalTopBar = $user && $user.stripeSubscription && $subscriptionJustEnded;
  // This controls a workaround to adjust the height reserved for the top notice (see below)
  // We keep it as a separate property because the condition here changes frequently.
  $: shouldShowTopBar = shouldShowRenewalTopBar;
</script>

<nav>
  {#if shouldShowRenewalTopBar && $user?.stripeSubscription}
    <div class="nav-extra">
      <!-- Inform renewal amount -->
      <span
        ><strong style="font-weight: 500;">
          {$renewalNoticeContent?.prompt}</strong
        >{' '}{@html $renewalNoticeContent?.answerHtml}
      </span>
    </div>
  {/if}
  <div class="main-nav">
    <WtmgLogo />
    <ul>
      <li>
        <NavLink href={routes.MAP}>{$_('generics.map')}</NavLink>
      </li>
      <li>
        <NavLink
          href={routes.RULES}
          on:click={() => trackEvent(PlausibleEvent.VISIT_RULES, { source: 'top_navbar' })}
          >{$_('generics.rules')}</NavLink
        >
      </li>
      <li>
        <NavLink href={routes.ABOUT_US}>{$_('generics.about-us')}</NavLink>
      </li>
      {#if $user?.superfan}
        <li style="display: inline-flex; flex-direction: row; align-items: center;">
          <NavLink href={COMMUNITY_FORUM_URL}>{$_('generics.community')}</NavLink>
        </li>
      {/if}
      {#if !$user?.superfan}
        <li>
          <NavLink
            href={routes.ABOUT_MEMBERSHIP}
            on:click={() =>
              trackEvent(PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'top_navbar' })}
            highlighted>{$_('generics.become-member')}</NavLink
          >
        </li>
      {/if}
      {#if firstName}
        <UserDropdown name={firstName || ''} />
      {:else}
        <li>
          <NavLink href={routes.SIGN_IN}>{$_('generics.sign-in')}</NavLink>
        </li>
      {/if}
    </ul>
  </div>
</nav>

<svelte:head>
  <!-- Applying this hack: https://github.com/sveltejs/svelte/issues/3105#issuecomment-584037243 -->
  <!-- TODO: Maybe replace later with: https://github.com/sveltejs/svelte/issues/3105#issuecomment-1440443254 -->
  <!-- !important is necessary because the svelte component-scoped CSS otherwise has higher CSS specificity -->
  <!--  -->
  <!-- Hide the extra bar vvvv (prettier duplicates this comment if put within the block on every save) -->
  {#if !shouldShowTopBar}
    <style>
      .nav-extra {
        display: none !important;
      }
      body {
        --height-nav-extra: 0px !important;
      }
    </style>
  {/if}
</svelte:head>

<style>
  :global(body) {
    --height-nav-main: 7rem;
    --height-nav-extra: 3.5rem;
    --height-nav: calc(var(--height-nav-extra) + var(--height-nav-main));
  }

  nav {
    position: fixed;
    top: 0;
    left: 0;
    height: var(--height-nav);
    /* z-index 0 results in the map overlapping the user dropdown nav menu on desktop */
    z-index: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--color-white);
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
  }

  nav > .main-nav {
    flex: 1;
    padding: 0 0 0 5rem;
    justify-content: space-between;
  }

  nav .nav-extra {
    background-color: var(--color-beige-light);
    text-align: right;
    height: var(--height-nav-extra);
    display: flex;
    justify-content: right;
    align-items: center;
    padding: 0 1.5rem;
  }

  nav .main-nav {
    display: flex;
    align-items: center;
  }

  nav .main-nav > ul {
    display: flex;
    align-items: center;
    height: 100%;
    padding-right: 5rem;
  }

  nav > .main-nav > ul > li {
    font-weight: 500;
    /* Required for the <NavLink> underline,
       wich is absolutely positioned */
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 8rem;
    text-align: center;
    margin-left: 4rem;
  }

  @media screen and (max-width: 1300px) {
    nav > .main-nav {
      padding-left: 3rem;
    }
    nav > .main-nav > ul {
      padding-right: 3rem;
    }
    nav > .main-nav > ul > li {
      margin-left: 2.8rem;
    }
  }

  @media screen and (max-width: 1200px) {
    nav > .main-nav {
      padding-left: 2rem;
    }
    nav > .main-nav > ul {
      padding-right: 2rem;
    }
  }

  @media screen and (max-width: 850px) {
    nav > .main-nav {
      padding-left: 1.5rem;
    }
    nav > .main-nav > ul {
      padding-right: 1.5rem;
    }
    nav > .main-nav > ul > li {
      margin-left: 1rem;
      min-width: 7rem;
    }
  }

  @media screen and (max-width: 700px) {
    nav {
      display: none;
    }
    /* Reset height top nav bar */
    :global(body) {
      --height-nav-main: 0px;
      --height-nav-extra: 0px;
    }
  }
</style>
