<script>
  import { _, locale } from 'svelte-i18n';
  import smoothscroll from 'smoothscroll-polyfill';
  import routes from '@/routes';
  import CollapsibleGroup from '../components/CollapsibleGroup.svelte';
  import { Button } from '../components/UI';
  import { getArrayFromLocale } from '@/util';
  import { user } from '@/stores/auth';

  import Logo from '../images/logo.svg';
  import welcomeMap from '../images/welcome-map.svg';
  import ArrowDown from '../images/arrow-down.svg';
  import Step1 from '../images/step-1.svg';
  import Step2 from '../images/step-2.svg';
  import Step3 from '../images/step-3.svg';

  function handleLearnMoreClick() {
    const stepsSection = document.getElementById('steps-section');
    stepsSection.scrollIntoView({ behavior: 'smooth' });
  }

  smoothscroll.polyfill();

  const stepGraphics = [Step1, Step2, Step3];

  $: steps = getArrayFromLocale('index.steps', $locale);
  $: faqQuestions = getArrayFromLocale('index.faq.questions', $locale);
</script>

<svelte:head>
  <title>Home | Welcome To My Garden</title>
</svelte:head>

<section class="landing">
  <div class="welcome">
    <div class="welcome-logo">
      {@html Logo}
    </div>
    <h1 class="heading-underline-center">Welcome To My Garden</h1>
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

<div class="learn-more">
  <span class="learn-more-text" aria-hidden>{$_('index.intro.learn-more')}</span>
  <button class="learn-more-button" on:click={handleLearnMoreClick}>
    <span class="screen-reader-only">{$_('index.intro.learn-more')}</span>
    <div>
      {@html ArrowDown}
    </div>
  </button>
</div>

<section id="steps-section" class="steps">
  {#each steps as { title, copy }, i}
    <div class="step">
      <div class="step-logo">
        {@html stepGraphics[i]}
      </div>
      <h2 class="step-header">{title}</h2>
      <p class="step-text">
        {@html $_(`index.steps.${i}.copy`, { values: { addGardenLink: routes.ADD_GARDEN } })}
      </p>
    </div>
  {/each}
</section>

<section class="faq">
  <div class="card faq-intro">
    <h1 class="heading-underline-center">{$_('index.faq.title')}</h1>
    <p>
      {@html $_('index.faq.copy', { values: { faqLink: routes.FAQ } })}
    </p>
  </div>
  <div class="faq-questions">
    <CollapsibleGroup collapsibles={faqQuestions} />
  </div>
</section>

<section class="cooperation">
  <!-- <div class="card cooperation-card partners">
    <h1 class="heading-underline-center">Our partners</h1>
    <div>Logos</div>
  </div> -->

  <div class="card cooperation-card support">
    <div class="cooperation-content">
      <h1 class="heading-underline-center">{$_('index.support.title')}</h1>
      <p>
        {@html $_('index.support.copy')}
      </p>
    </div>
  </div>
</section>

<style>
  h1 {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 9rem;
    font-family: var(--fonts-titles);
    margin-bottom: 3rem;
    color: var(--color-green);
  }

  h2 {
    font-size: 1.8rem;
    font-weight: bold;
    line-height: 2.8rem;
    font-family: var(--fonts-copy);
    color: var(--color-green);
    text-transform: uppercase;
  }

  section {
    margin-bottom: 9rem;
  }

  p {
    font-size: 1.6rem;
    line-height: 2.6rem;
    color: var(--color-green);
    margin-bottom: 2rem;
  }

  a {
    font-weight: bold;
    text-decoration: underline;
  }

  .welcome-buttons > :global(.button) {
    margin-bottom: 1rem;
  }

  .screen-reader-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap; /* added line */
    border: 0;
  }

  .heading-underline-center {
    position: relative;
  }

  .heading-underline-center::after {
    position: absolute;
    bottom: -4px;
    left: 50%;
    content: '';
    height: 3px;
    background: var(--color-orange);
    width: 12rem;
    margin-left: -6rem;
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

  .learn-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem 0 7rem 0;
  }

  .learn-more-text {
    font-weight: bold;
    margin-bottom: 2rem;
  }

  .learn-more-button {
    border: none;
    cursor: pointer;
    background: none;
    transition: 0.3s;
  }

  .learn-more-button:hover {
    transform: translate(0, 1.2rem);
  }

  .steps {
    display: flex;
    padding: 0 10rem;
    text-align: justify;
    justify-content: space-between;
  }

  .steps :global(a),
  .cooperation-content :global(a) {
    font-weight: bold;
    text-decoration: underline;
    color: var(--color-orange);
  }

  .step {
    display: grid;
    grid-template-rows: 17rem 0.8fr 2fr;
    max-width: 60rem;
    width: 30%;
  }

  .step-header {
    font-family: var(--font-copy);
    font-weight: bold;
  }

  .step-logo {
    display: flex;
    justify-content: center;
  }

  .card p {
    line-height: 3.2rem;
    text-align: center;
  }

  .faq {
    display: flex;
  }

  .faq-intro {
    background-color: var(--color-green);
    width: 50%;
    padding: 6rem 15rem;
    text-align: center;
  }

  .faq-questions {
    width: 50%;
  }
  .faq-intro h1 {
    color: var(--color-white);
  }

  .faq-intro p {
    color: var(--color-white);
    line-height: 3.2rem;
  }

  .faq-intro :global(a) {
    color: var(--color-white);
    text-decoration: underline;
  }

  .cooperation {
    display: flex;
  }

  .cooperation h1 {
    margin-bottom: 4.6rem;
  }

  .cooperation-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    /* width: 50%; */
    padding: 12rem 10rem 14rem;
    flex: 1;
    align-items: center;
  }

  .cooperation-content {
    max-width: 620px;
  }

  .support {
    background-color: var(--color-beige-light);
  }

  @media only screen and (max-width: 1500px) {
    .faq-intro {
      padding: 6rem 12rem;
    }
  }

  @media only screen and (max-width: 1300px) {
    h1 {
      font-size: 2.8rem;
      margin-bottom: 2.3rem;
      line-height: 7.5rem;
    }

    .faq-intro {
      padding: 6rem 10rem;
    }

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

  @media only screen and (max-width: 1150px) {
    .steps {
      flex-direction: column;
      padding: 0 12rem;
      align-items: center;
    }

    .step {
      width: 100%;
    }

    .step-header {
      text-align: center;
      margin-bottom: 1rem;
    }

    .faq {
      flex-direction: column;
      margin-bottom: 0;
    }

    .faq > * {
      width: 100%;
    }

    .faq-intro {
      padding: 6rem 12rem 8rem;
      flex: 0;
    }

    .cooperation {
      flex-direction: column;
    }

    .cooperation > * {
      width: 100%;
    }

    .cooperation-card {
      padding-top: 10rem;
    }

    /* .partners {
      order: 2;
    } */

    .support {
      order: 1;
    }
  }

  @media only screen and (max-width: 1000px) {
    .landing {
      padding: 14rem 10rem 0;
    }

    .welcome-logo {
      width: 30vw;
    }

    .steps {
      padding: 0 10rem;
    }

    .faq-intro {
      padding: 6rem 10rem 8rem;
    }
  }

  @media only screen and (max-width: 700px) {
    h2 {
      font-size: 1.6rem;
    }

    p {
      font-size: 1.4rem;
    }

    .learn-more {
      display: none;
    }

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
    .steps {
      padding: 0 8rem;
    }

    .step {
      margin: 0 auto;
    }

    .faq-intro {
      padding: 4rem 8rem 6rem;
    }

    .cooperation-card {
      padding: 8rem 8rem 10rem;
    }
  }

  @media only screen and (max-width: 600px) {
    h1 {
      font-size: 2.2rem;
      margin-bottom: 2rem;
      line-height: 6.5rem;
    }

    .heading-underline-center {
      font-size: 2rem;
      line-height: 2;
    }
  }

  @media only screen and (max-width: 500px) {
    p {
      font-size: 1.4rem;
    }

    .landing {
      padding: 10rem 4rem 2rem;
    }

    .welcome-map {
      width: 40vw;
    }

    .welcome-logo {
      width: 45vw;
    }

    .steps {
      padding: 0 4rem;
    }

    .faq-intro {
      padding: 4rem 4rem 6rem;
    }

    .cooperation-card {
      padding: 8rem 4rem 10rem;
    }
  }

  @media only screen and (max-width: 400px) {
    h1 {
      font-size: 1.8rem;
      line-height: 5.5rem;
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.4rem;
    }

    .landing {
      padding: 6rem 3rem;
    }

    .welcome-text {
      margin-bottom: 2rem;
    }

    .welcome-logo {
      width: 50vw;
    }

    .steps {
      padding: 0 3rem;
    }

    .faq-intro {
      padding: 4rem 3rem 6rem;
    }

    .faq-intro p {
      line-height: 2.6rem;
    }

    .card p {
      line-height: 2.6rem;
    }

    .cooperation-card {
      padding: 8rem 3rem 10rem;
    }
  }
</style>
