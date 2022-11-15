<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { Icon, Button } from '$lib/components/UI';
  import { binocularsIcon } from '$lib/images/icons';
</script>

<div class="available-space-container">
  <div class="fallback-container">
    <div class="icon">
      <Icon icon={binocularsIcon} />
    </div>
    <h1>{$_('fallback.404')}</h1>
    <Button href={routes.HOME} uppercase medium>{$_('fallback.redirect')}</Button>
  </div>
</div>

<style>
  .available-space-container {
    height: calc(100vh - var(--height-footer) - var(--height-nav));
    display: flex;
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
    font-weight: 900;
    text-transform: uppercase;
    font-family: var(--fonts-copy);
  }

  .icon {
    width: 20rem;
  }

  @media only screen and (max-width: 700px) {
    .icon {
      width: 15rem;
    }
    .available-space-container {
      height: calc(100vh - var(--height-nav));
    }
  }
</style>
