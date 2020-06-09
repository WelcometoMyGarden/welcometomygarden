<script>
  import smoothscroll from 'smoothscroll-polyfill';
  import FaqItem from '../components/FaqItem.svelte';
  import { Button } from '../components/UI';

  import Logo from '../images/logo.svg';
  import WelcomeMap from '../images/welcome-map.svg';
  import ArrowDown from '../images/arrow-down.svg';
  import Step1 from '../images/step-1.svg';
  import Step2 from '../images/step-2.svg';
  import Step3 from '../images/step-3.svg';

  function handleLearnMoreClick() {
    const stepsSection = document.getElementById('steps-section');
    stepsSection.scrollIntoView({ behavior: 'smooth' });
  }

  smoothscroll.polyfill();
</script>

<section class="landing">
  <div class="welcome">
    <div>
      {@html Logo}
    </div>
    <h1 class="heading-underline-center">Welcome to My Garden</h1>
    <p class="welcome-text">
      We are a network of citizens offering free camping spots in their gardens for slow travelers
    </p>
    <div class="welcome-buttons">
      <Button uppercase inverse>Add your garden</Button>
      <Button uppercase>Explore map</Button>
    </div>
    <div id="welcome-map">
      {@html WelcomeMap}
    </div>
  </div>
</section>

<div class="learn-more">
  <span class="learn-more-text" aria-hidden>Learn more</span>
  <button class="learn-more-button" on:click={handleLearnMoreClick}>
    <span class="screen-reader-only">Learn more</span>
    <div>
      {@html ArrowDown}
    </div>
  </button>
</div>

<section id="steps-section" class="steps">
  <div class="step">
    <div class="step-logo">
      {@html Step1}
    </div>
    <h2 class="step-header">Step 1: Sign up to become or find a host</h2>
    <p class="step-text">
      Do you want to open up your garden? Please click the Add your garden button. Are you looking
      for a camping spot? Pick your favourite garden and contact your host! Arrange a date and time
      for your stay and off you go!
    </p>
  </div>
  <div class="step">
    <div class="step-logo">
      {@html Step2}
    </div>
    <h2 class="step-header">Step 2: Plan your journey</h2>
    <p class="step-text">
      After you’ve made arrangements with your hosts, walk or bike to your camping spot. Introduce
      yourself, pitch your tent for the night, and continue on your hiking or biking trail the next
      day. And have a great time, of course!
    </p>
  </div>
  <div class="step">
    <div class="step-logo">
      {@html Step3}
    </div>
    <h2 class="step-header">Step 3: Pitch your tent and have fun!</h2>
    <p class="step-text">
      Have a quiet night all by yourself, have fun with your friends or family or hang out with your
      host - whatever both parties prefer. Say fond farewells and continue on your hike or ride the
      next day!
    </p>
  </div>
</section>

<section class="faq">
  <div class="card faq-intro">
    <h1 class="heading-underline-center">All you need to know</h1>
    <p>
      Here are the most important things you need to know about your next adventure. Please read
      this FAQ section thoroughly so that you know what you’re getting yourself into.
    </p>
  </div>
  <ul class="faq-list">
    <FaqItem>
      <h3 slot="title">Who is Welcome To My Garden for?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </FaqItem>
    <FaqItem>
      <h3 slot="title">How do I get to my camping spot?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </FaqItem>
    <FaqItem>
      <h3 slot="title">How do I request a stay?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </FaqItem>
    <FaqItem>
      <h3 slot="title">What about facilities?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </FaqItem>
    <FaqItem>
      <h3 slot="title">Does Welcome To My Garden cost anything?</h3>
      <p slot="content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique eaque obcaecati laborum
        rerum beatae culpa itaque voluptate corrupti repudiandae ea esse quas harum nam, sunt non
        iure minima modi blanditiis?
      </p>
    </FaqItem>
  </ul>
</section>

<section class="cooperation">
  <div class="card cooperation-card partners">
    <h1 class="heading-underline-center">Our partners</h1>
    <div>Logos</div>
  </div>

  <div class="card cooperation-card support">
    <h1 class="heading-underline-center">Support us</h1>
    <p>
      Welcome to My Garden is free to use but we have to pay a couple of bills.
      <a href="#">Make a donation</a>
      to keep us going!
    </p>
  </div>
</section>

<style>
  h1 {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 93px;
    font-family: var(--fonts-titles);
    margin-bottom: 30px;
    color: var(--color-green);
  }

  h2 {
    font-size: 1.8rem;
    font-weight: bold;
    line-height: 28px;
    font-family: var(--fonts-copy);
    color: var(--color-green);
    text-transform: uppercase;
  }

  section {
    margin-bottom: 90px;
  }

  p {
    font-size: 1.6rem;
    line-height: 26px;
    color: var(--color-green);
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

  #welcome-map {
    position: absolute;
    right: 0;
    top: 0;
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
    width: 120px;
    margin-left: -60px;
  }

  .landing {
  }

  .welcome {
    max-width: 650px;
    text-align: center;
    padding-top: 143px;
    padding-left: 173px;
  }

  .welcome-text {
    margin-bottom: 37px;
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

  .welcome-button {
  }

  .learn-more {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20px 0 70px 0;
  }

  .learn-more-text {
    font-weight: bold;
    margin-bottom: 20px;
  }

  .learn-more-button {
    border: none;
    cursor: pointer;
    background: none;
  }

  .steps {
    display: flex;
    padding: 0 100px;
  }

  .step {
    text-align: justify;
    margin-right: 68px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .step-logo {
    display: flex;
    justify-content: center;
  }

  .step:last-of-type {
    margin-right: 0;
  }

  .step-header {
    margin-bottom: 6px;
  }

  .card p {
    line-height: 32px;
  }

  .faq {
    display: flex;
  }

  .faq-intro {
    background-color: var(--color-green);
    width: 50%;
    padding: 60px 150px;
  }

  .faq-intro h1 {
    color: var(--color-white);
  }

  .faq-intro p {
    color: var(--color-white);
    line-height: 32px;
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
    margin-bottom: 46px;
  }

  .cooperation-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
    width: 50%;
  }

  .partners {
  }

  .support {
    background-color: var(--color-beige);
    padding: 116px 96px;
  }
</style>
