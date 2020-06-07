<script>
  import PageContainer from '../components/UI/PageContainer.svelte';
  import Logo from '../images/logo.svg';
  import WelcomeMap from '../images/welcome-map.svg';
</script>

<PageContainer>
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
        <button class="welcome-button button-primary-inverse">Add your garden</button>
        <button class="welcome-button button-primary">Explore map</button>
      </div>
      <div id="welcome-map">
        {@html WelcomeMap}
      </div>
    </div>
  </section>

  <div class="learn-more">
    <span class="learn-more-text">Learn more</span>
  </div>

  <section class="steps">
    <div class="step">
      <h2 class="step-header">Step 1: Sign up to become or find a host</h2>
      <p class="step-text">
        Do you want to open up your garden? Please click the Add your garden button. Are you looking
        for a camping spot? Pick your favourite garden and contact your host! Arrange a date and
        time for your stay and off you go!
      </p>
    </div>
    <div class="step">
      <h2 class="step-header">Step 2: Plan your journey</h2>
      <p class="step-text">
        After you’ve made arrangements with your hosts, walk or bike to your camping spot. Introduce
        yourself, pitch your tent for the night, and continue on your hiking or biking trail the
        next day. And have a great time, of course!
      </p>
    </div>
    <div class="step">
      <h2 class="step-header">Step 3: Pitch your tent and have fun!</h2>
      <p class="step-text">
        Have a quiet night all by yourself, have fun with your friends or family or hang out with
        your host - whatever both parties prefer. Say fond farewells and continue on your hike or
        ride the next day!
      </p>
    </div>
  </section>

  <section class="faq">
    <div class="card faq-intro">
      <h1 class="heading-underline-left">All you need to know</h1>
      <p>
        Here are the most important things you need to know about your next adventure. Please read
        this FAQ section thoroughly so that you know what you’re getting yourself into.
      </p>
    </div>
    <ul class="faq-list">
      <li class="faq-list-item">
        Who is Welcome to My Garden for?
        <span class="plus">+</span>
      </li>
      <li class="faq-list-item">
        How do I get to my camping spot?
        <span class="plus">+</span>
      </li>
      <li class="faq-list-item">
        How do I request a stay?
        <span class="plus">+</span>
      </li>
      <li class="faq-list-item">
        What about facilities?
        <span class="plus">+</span>
      </li>
      <li class="faq-list-item">
        Does Welcome to My Garden cost anything?
        <span class="plus">+</span>
      </li>
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

</PageContainer>

<style>
  h1 {
    font-size: 36px;
    font-weight: bold;
    line-height: 93px;
    font-family: var(--fonts-titles);
    margin-bottom: 30px;
  }

  h2 {
    font-size: 20px;
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
    font-size: 18px;
    line-height: 26px;
    color: var(--color-green);
  }

  a {
    font-weight: bold;
    text-decoration: underline;
  }

  #welcome-map {
    position: absolute;
    right: 0;
    top: 0;
  }

  .heading-underline-left {
    position: relative;
  }

  .heading-underline-left::after {
    position: absolute;
    bottom: -4px;
    left: 0;
    content: '';
    height: 3px;
    background: var(--color-orange);
    width: 120px;
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
  }

  .welcome-button {
    border-radius: 6px;
    border: 2px solid var(--color-orange);
    width: fit-content;
    padding: 17px 26px;
    text-transform: uppercase;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
  }

  .welcome-button:first-of-type {
    margin-bottom: 16px;
  }

  .button-primary {
    background-color: var(--color-orange);
    color: var(--color-white);
  }

  .button-primary-inverse {
    background-color: var(--color-white);
    color: var(--color-orange);
  }

  .learn-more {
    display: flex;
    justify-content: center;
    margin: 20px 0 70px 0;
  }

  .learn-more-text {
    font-weight: bold;
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

  .step:last-of-type {
    margin-right: 0;
  }

  .step-header {
    margin-bottom: 6px;
  }

  .card p {
    font-size: 18px;
    line-height: 32px;
  }

  .faq {
    display: flex;
  }

  .faq-intro {
    background-color: var(--color-green);
    color: var(--color-white);
    width: 50%;
    padding: 60px 150px;
  }

  .faq-intro p {
    color: var(--color-white);
    line-height: 32px;
  }

  .faq-list {
    padding-left: 56px;
    padding-right: 113px;
    width: 50%;
  }

  .faq-list-item {
    font-weight: 600;
    font-size: 18px;
    color: var(--color-copy);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    padding: 30px 0;
    display: flex;
  }

  .plus {
    margin-left: auto;
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
