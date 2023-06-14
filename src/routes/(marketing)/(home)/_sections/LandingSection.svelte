<script>
  import Button from '$lib/components/UI/Button.svelte';
  import Logo from '$lib/images/logo.svg';
  import welcomeMap from '$lib/images/welcome-map.svg';
  import { user } from '$lib/stores/auth';
  import routes from '$lib/routes';
  import { _, locale } from 'svelte-i18n';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import GardenCounter from '../GardenCounter.svelte';
</script>

<PaddedSection id="landing">
  <div class="welcome">
    <div class="welcome-logo">
      {@html Logo}
    </div>
    <span class="mobile-heading oh1">{$_('generics.wtmg.explicit')}</span>
    <h1 class="landing-headline heading-underline heading-underline--left">
      {$_('index.intro.headline')}
    </h1>
    <div class="welcome-text">
      <p>{$_('index.intro.copy')}</p>
      <p>
        {$_('index.intro.garden-count-before')}{' '}<span class="garden-count"
          ><GardenCounter />{' '}{$_('generics.garden').toLocaleLowerCase()}{$locale === 'nl'
            ? 'en'
            : 's'}</span
        >{$_('index.intro.garden-count-after')}
      </p>
    </div>
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
</PaddedSection>

<style>
  .welcome-buttons > :global(.button) {
    margin-bottom: 1rem;
  }

  .mobile-heading {
    display: none;
  }

  h1.landing-headline {
    text-transform: uppercase;
    font-family: var(--fonts-copy);
    font-weight: 600;
    line-height: 1.4;
  }

  .welcome-map {
    position: absolute;
    right: 0;
    top: -3vw;
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
    overflow: hidden;
  }

  .welcome-logo {
    align-self: flex-start;
    width: 10rem;
    margin-bottom: 1.5rem;
    max-width: 90%;
    /* margin: auto; */
    /* width: 15vw; */
    /* max-width: 23.3rem;
    min-width: 16rem; */
  }

  .welcome-logo > :global(svg) {
    max-width: 100%;
  }

  .welcome-text {
    text-align: left;
    margin-bottom: 3.7rem;
  }

  .welcome-text > p:last-child {
    margin-bottom: 0;
  }

  .garden-count {
    font-weight: 600;
  }

  .welcome-buttons {
    display: flex;
    gap: 2rem;
    align-self: flex-start;
    flex-direction: row-reverse;
    align-items: center;
  }

  @media only screen and (max-width: 1000px) {
    .welcome {
      margin: auto;
      text-align: center;
    }

    .welcome-buttons {
      align-self: center;
    }
    .welcome-logo {
      margin-top: 15rem;
      /* 11 rem for small mobiles, 22vw going to tablet sizes (until 1000px wide) */
      width: calc(max(11rem, 22vw));
      align-self: center;
      margin-bottom: 0.5rem;
    }
    span.mobile-heading {
      display: inline-block;
      line-height: 1.4;
      margin-bottom: 0.5rem;
    }
    h1.landing-headline {
      text-transform: none;
      font-weight: normal;
      font-size: 2rem;
      position: relative;
      display: inline-block;
      /* To be used together with the ::after spec below */
      margin-bottom: 6rem;
    }

    h1.landing-headline.heading-underline--left::after {
      left: calc(50% - 6rem);
      display: inline-block;
      bottom: -3rem;
    }

    .welcome-text {
      text-align: center;
      max-width: 500px;
    }
  }
  @media only screen and (max-width: 700px) {
    div.welcome-map {
      top: 0rem;
    }
    .welcome-buttons {
      align-self: center;
      flex-direction: column;
      gap: 0.5rem;
    }

    h1.landing-headline.heading-underline--left::after {
      left: calc(50% - 6rem);
    }
  }

  @media only screen and (max-width: 500px) {
    .welcome-logo {
      margin-top: 21rem;
    }
    div.welcome-map {
      top: -4rem;
      right: -5rem;
    }
    div.welcome-map {
      width: 29rem;
      right: -10rem;
    }
  }
</style>
