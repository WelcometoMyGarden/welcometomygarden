<script>
  import Button from '$lib/components/UI/Button.svelte';
  import Logo from '$lib/images/logo.svg';
  import welcomeMap from '$lib/images/welcome-map.svg';
  import { isInitializingFirebase, user } from '$lib/stores/auth';
  import routes from '$lib/routes';
  import { _ } from 'svelte-i18n';
  import GardenCounter from '../GardenCounter.svelte';
  import { hasLoaded as gardenHasLoaded } from '$lib/stores/garden';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import { appHasLoaded } from '$lib/stores/app';
  import { lr } from '$lib/util/translation-helpers';
  import ViteSVG from '$lib/components/UI/ViteSVG.svelte';
</script>

<PaddedSection id="landing">
  <div class="welcome">
    <div class="welcome-logo">
      <ViteSVG icon={Logo}></ViteSVG>
    </div>
    <span class="mobile-heading oh1">{$_('generics.wtmg.explicit')}</span>
    <h1 class="landing-headline heading-underline heading-underline--left">
      {$_('index.intro.headline')}
    </h1>
    <div class="welcome-text">
      <p>{$_('index.intro.copy')}</p>
      <p>
        {$_('index.intro.garden-count-before')}{' '}<span class="garden-count"
          >{#if !$isInitializingFirebase}
            <GardenCounter />
          {/if}{' '}{$_('index.intro.garden-count-noun')}</span
        >{$_('index.intro.garden-count-after')}
      </p>
    </div>
    <div class="welcome-buttons">
      <!-- User is not logged in, or the user does not have a garden yet -->
      {#if $appHasLoaded && (!$user || ($gardenHasLoaded && !$user.garden))}
        <Button href={$lr(routes.ADD_GARDEN)} fit={false} uppercase inverse>
          {$_('index.intro.add-garden')}
        </Button>
      {/if}
      <Button href={$lr(routes.MAP)} fit={false} uppercase>{$_('index.intro.explore-map')}</Button>
    </div>
    <div class="welcome-map">
      <ViteSVG icon={welcomeMap}></ViteSVG>
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
    top: 5vw;
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
    /* div conatiner of the map svg */
    div.welcome-map {
      top: -4rem;
      width: 29rem;
      right: -10rem;

      /* Some hacky tuning for mobile*/
      transform: rotate(20deg) scale(1.05);
    }

    div.welcome-map > :global(svg .pin) {
      transform: rotate(-28deg) translate(-167px, -16px);
      transform-origin: 57% 50%;
    }
  }
</style>
