<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { Icon, Button } from '$lib/components/UI';
  import { binocularsIcon } from '$lib/images/icons';
  import { page } from '$app/stores';
  import { localeIsLoaded } from '$lib/stores/app';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
</script>

<svelte:head>
  {#if $localeIsLoaded}
    {#if $page.error?.message === 'Not Found'}
      <title>{$_('fallback.404')} | {$_('generics.wtmg.explicit')}</title>
    {:else}
      <title>Error | {$_('generics.wtmg.explicit')}</title>
    {/if}
  {:else}
    <title>Error | Welcome To My Garden</title>
  {/if}
</svelte:head>

{#if $localeIsLoaded}
  <Navigation />
{/if}
<div class="available-space-container expand-70">
  <div class="fallback-container">
    <div class="icon">
      <Icon icon={binocularsIcon} />
    </div>
    <h1>
      {$page.error?.message === 'Not Found' && $localeIsLoaded
        ? $_('fallback.404')
        : ($page.error?.message ?? 'Something went wrong')}
    </h1>
    <Button href={routes.HOME} uppercase medium>
      {$localeIsLoaded ? $_('fallback.redirect') : 'Back to home'}
    </Button>
  </div>
</div>

<style>
  .available-space-container {
    height: 100%;
    display: flex;
    padding: var(--section-inner-padding);
  }

  .fallback-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  h1 {
    padding-top: 3rem;
    padding-bottom: 7rem;
    font-size: clamp(1.8rem, 0.1731rem + 4.5192vw, 6.5rem);
    font-weight: 700;
    text-transform: uppercase;
    font-family: var(--fonts-copy);
    text-align: center;
  }

  .icon {
    width: 20rem;
  }

  @media only screen and (max-width: 700px) {
    .icon {
      width: 15rem;
    }
  }
</style>
