<script>
  import { _ } from 'svelte-i18n';
  import smoothscroll from 'smoothscroll-polyfill';
  import routes from '@/routes';
  import Collapsible from '../components/Collapsible.svelte';
  import { Button } from '../components/UI';
  import { getArrayFromLocale } from '@/util';

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

  let activeCollapsible = null;
  const setActiveCollapsible = id => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };

  const stepGraphics = [Step1, Step2, Step3];
  const faqItems = [
    {
      title: 'Who is Welcome To My Garden for?',
      content:
        'Welcome To My Garden has been created for hikers and cyclists who need a camping spot on their trail at the end of the day. It isn’t meant to replace fully-fledged campsites; just a safe spot for the night! Consider it an addition to Belgium’s network of bivouacking sites. Welcome to My Garden is non-commercial: no money should exchange hands. This means that as a host, you cannot ask your guests to pay for their stay.'
    },
    {
      title: 'How do I get to my camping spot?',
      content:
        "Welcome To My Garden is for slow travellers only. Please walk or bike to your camping spot. Of course you can use public transport or your car to get to the start of your trail - as long as you don't turn up at your host's in your car!"
    },
    {
      title: 'How do I request a stay?',
      content:
        'Except if clearly stated on the host’s profile, you should always contact the host in advance. When you request a stay, please provide some information about yourself, your arrival date and time.'
    },
    {
      title: 'What about facilities?',
      content:
        'Basically hosts just offer a corner in their garden for you to pitch your tent on. In addition, they may offer access to drinking water, a toilet and electricity. They are not obliged to do so though: all of these are bonuses. Consider a garden as a bivouac spot; not a fully-fledged campsite.'
    },
    {
      title: 'Does Welcome To My Garden cost anything?',
      content:
        'Using Welcome To My Garden is completely free. However, as a platform we do incur costs. If you want to make a donation that will put a big smile on our faces! We are a not-for-profit initiative, so we’re not making any money out of this.'
    }
  ];
</script>

<section class="landing">
  <div class="welcome">
    <div class="welcome-logo">
      {@html Logo}
    </div>
    <h1 class="heading-underline-center">Welcome to My Garden</h1>
    <p class="welcome-text">{$_('index.intro.copy')}</p>
    <div class="welcome-buttons">
      <Button uppercase inverse moveUp>{$_('index.intro.add-garden')}</Button>
      <Button uppercase moveUp>{$_('index.intro.explore-map')}</Button>
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
  {#each getArrayFromLocale('index.steps') as step, i}
    <div class="step">
      <div class="step-logo">
        {@html stepGraphics[i]}
      </div>
      <h2 class="step-header">{step.title}</h2>
      <p class="step-text">{step.content}</p>
    </div>
  {/each}
</section>

<section class="faq">
  <div class="card faq-intro {activeCollapsible ? 'faq-intro-item-opened' : ''}">
    <h1 class="heading-underline-center">All you need to know</h1>
    <p>
      Here are the most important things you need to know about your next adventure. Please read
      this FAQ section thoroughly so that you know what you’re getting&nbsp;yourself&nbsp;into.
    </p>
    <a href={routes.FAQ}>
      The full list of frequently asked questions
      <span aria-hidden="true">>></span>
    </a>
  </div>
  <ul class="faq-list">
    {#each faqItems as faqItem, i}
      <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
        <h3 slot="title">{faqItem.title}</h3>
        <p slot="content">{faqItem.content}</p>
      </Collapsible>
    {/each}
  </ul>
</section>

<section class="cooperation">
  <!-- <div class="card cooperation-card partners">
    <h1 class="heading-underline-center">Our partners</h1>
    <div>Logos</div>
  </div> -->

  <div class="card cooperation-card support">
    <div class="cooperation-content">
      <h1 class="heading-underline-center">Support us</h1>
      <p>
        Welcome to My Garden is free to use but we have to pay a couple of bills.
        <a href="https://opencollective.com/welcometomygarden" target="_blank">Make a donation</a>
        to keep us going!
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
    text-align: justify;
    margin-bottom: 2rem;
  }

  a {
    font-weight: bold;
    text-decoration: underline;
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
  }

  .step {
    margin-right: 7rem;
    display: grid;
    grid-template-rows: 17rem 0.8fr 2fr;
  }

  .step-header {
    font-family: var(--font-copy);
    font-weight: bold;
  }

  .step:last-of-type {
    margin-right: 0;
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

  .faq-intro h1 {
    color: var(--color-white);
  }

  .faq-intro p {
    color: var(--color-white);
    line-height: 3.2rem;
  }

  .faq-intro a {
    color: var(--color-white);
  }

  .faq-list {
    padding: 0 2rem;
    width: 50%;
    display: flex;
    flex-direction: column;
  }

  .faq-list > :global(li:first-child button) {
    padding-top: 0;
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
    }

    .step {
      margin-right: 0;
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

    .faq-list {
      padding: 0;
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
