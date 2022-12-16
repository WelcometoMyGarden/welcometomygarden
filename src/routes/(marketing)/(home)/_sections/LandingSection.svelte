<script>
  import Button from '@/lib/components/UI/Button.svelte';
  import Logo from '$lib/images/logo.svg';
  import welcomeMap from '$lib/images/welcome-map.svg';
  import { user } from '@/lib/stores/auth';
  import routes from '$lib/routes';
  import { _ } from 'svelte-i18n';
</script>

<section class="landing" id="landing">
  <div class="welcome">
    <div class="welcome-logo">
      {@html Logo}
    </div>
    <h1 class="oh1 heading-underline-center">Welcome To My Garden</h1>
    <p class="welcome-text">{$_('index.intro.copy')}</p>
    <div class="welcome-buttons">
      <!-- User is not logged in -->
      {#if !$user}
        <Button href={routes.REGISTER} fit={false} uppercase inverse>
          {$_('index.intro.add-garden')}
        </Button>
        <!-- User is logged in and has no garden -->
      {:else if $user && !$user.garden}
        <Button href={routes.ADD_GARDEN} fit={false} uppercase inverse>
          {$_('index.intro.add-garden')}
        </Button>
      {/if}
      <Button href={routes.MAP} fit={false} uppercase>{$_('index.intro.explore-map')}</Button>
    </div>
    <div class="welcome-map">
      {@html welcomeMap}
    </div>
  </div>
</section>

<style>
  .welcome-buttons > :global(.button) {
    margin-bottom: 1rem;
  }

  .landing {
    display: flex;
    padding-top: 14rem;
    padding-left: 17rem;
  }

  .welcome-map {
    position: absolute;
    right: 0;
    top: 0;
    width: 35vw;
    max-width: 54rem;
  }

  .welcome-map > :global(svg) {
    max-width: 100%;
  }

  .welcome {
    max-width: 55rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .welcome-logo {
    width: 20vw;
    max-width: 23.3rem;
    min-width: 16rem;
  }

  .welcome-logo > :global(svg) {
    max-width: 100%;
  }

  .welcome-text {
    margin-bottom: 3.7rem;
    text-align: center;
  }

  .welcome-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 auto;
  }

  .welcome-buttons :global(button:first-of-type) {
    margin-bottom: 1.6rem;
  }

  @media only screen and (max-width: 1300px) {
    .landing {
      justify-content: center;
      padding-left: 0;
    }

    .welcome {
      padding-left: 0;
    }

    .welcome-logo {
      width: 25vw;
    }
  }

  @media only screen and (max-width: 1000px) {
    .landing {
      padding: 14rem 10rem 0;
    }

    .welcome-logo {
      width: 30vw;
    }
  }

  @media only screen and (max-width: 700px) {
    .landing {
      padding: 10rem 8rem 2rem;
    }

    .welcome-logo {
      width: 40vw;
    }

    .welcome-map {
      top: -2rem;
      width: 35vw;
    }
  }

  @media only screen and (max-width: 500px) {
    .landing {
      padding: 10rem 4rem 2rem;
    }

    .welcome-map {
      width: 40vw;
    }

    .welcome-logo {
      width: 45vw;
    }
  }
  @media only screen and (max-width: 400px) {
    .landing {
      padding: 6rem 3rem;
    }

    .welcome-logo {
      width: 50vw;
    }
  }
</style>
