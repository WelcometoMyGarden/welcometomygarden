<script>
  import { _ } from 'svelte-i18n';
  import smoothscroll from 'smoothscroll-polyfill';
  import ArrowDown from '$lib/images/arrow-down.svg';
  import enterHandler from '$lib/util/keyhandlers';

  const handleLearnMoreClick = () => {
    const navBarHeightElem = document.getElementById('navigation');
    const stepsSection = document.getElementById('steps-section');
    if (navBarHeightElem && stepsSection) {
      const navBarHeight = parseInt(
        getComputedStyle(navBarHeightElem).getPropertyValue('height'),
        10
      );
      const topOfStepsSection = stepsSection.offsetTop - navBarHeight;
      window.scroll({ top: topOfStepsSection, behavior: 'smooth' });
    }
  };

  smoothscroll.polyfill();
</script>

<div
  class="learn-more"
  id="learn-more"
  on:click={handleLearnMoreClick}
  on:keypress={enterHandler(handleLearnMoreClick)}
>
  <span class="learn-more-text" aria-hidden>{$_('index.intro.learn-more')}</span>
  <button class="learn-more-button">
    <span class="screen-reader-only">{$_('index.intro.learn-more')}</span>
    <div>
      {@html ArrowDown}
    </div>
  </button>
</div>

<style>
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
    border: none;
    background: none;
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
