<script>
  import { _ } from 'svelte-i18n';
  import smoothscroll from 'smoothscroll-polyfill';
  import ArrowDown from '$lib/images/arrow-down.svg';
  import enterHandler from '$lib/util/keyhandlers';
  import { browser } from '$app/environment';

  const handleLearnMoreClick = () => {
    const navBarHeightElem = document.getElementById('top-nav');
    const stepsSection = document.getElementById('steps-section');
    if (navBarHeightElem && stepsSection) {
      const navBarHeight = parseInt(
        getComputedStyle(navBarHeightElem).getPropertyValue('height'),
        10
      );
      const topOfStepsSection = stepsSection.offsetTop - navBarHeight;
      const appContainer = document.querySelector('.app');
      appContainer?.scroll({ top: topOfStepsSection, behavior: 'smooth' });
    }
  };

  if (browser) {
    smoothscroll.polyfill();
  }
</script>

<button
  class="learn-more"
  id="learn-more"
  on:click={handleLearnMoreClick}
  on:keypress={enterHandler(handleLearnMoreClick)}
>
  <span class="learn-more-text" aria-hidden>{$_('index.intro.learn-more')}</span>
  <div class="learn-more-button">
    <span class="screen-reader-only">{$_('index.intro.learn-more')}</span>
    <div>
      {@html ArrowDown}
    </div>
  </div>
</button>

<style>
  /* Reset button styles */
  button {
    background: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
    text-align: center;
    display: block;
    width: 100%;
  }

  .learn-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem 0 7rem 0;
    cursor: pointer;
  }

  .learn-more-text {
    font-weight: bold;
    margin-bottom: 2rem;
  }

  .learn-more-button {
    transition: 0.3s;
  }

  .learn-more-button:hover {
    transform: translate(0, 1.2rem);
  }

  @media only screen and (max-width: 700px) {
    .learn-more {
      display: none;
    }
  }
</style>
