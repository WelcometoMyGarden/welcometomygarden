<script>
  import PageContainer from '../components/UI/PageContainer.svelte';
</script>

<PageContainer>
  <section class="welcome">
    <h1>Welcome to My Garden</h1>
    <p>
      We are a network of citizens offering free camping spots in their gardens for slow travelers
    </p>
    <div class="welcome-buttons">
      <button>Add your garden</button>
      <button>Explore map</button>
    </div>

  </section>

  <section class="steps">
    <div class="step">
      <h2>Step 1: Sign up to become or find a host</h2>
      <p>
        Do you want to open up your garden? Please click the Add your garden button. Are you looking
        for a camping spot? Pick your favourite garden and contact your host! Arrange a date and
        time for your stay and off you go!
      </p>
    </div>
    <div class="step">
      <h2>Step 2: Plan your journey</h2>
      <p>
        After you’ve made arrangements with your hosts, walk or bike to your camping spot. Introduce
        yourself, pitch your tent for the night, and continue on your hiking or biking trail the
        next day. And have a great time, of course!
      </p>
    </div>
    <div class="step">
      <h2>Step 3: Pitch your tent and have fun!</h2>
      <p>
        Have a quiet night all by yourself, have fun with your friends or family or hang out with
        your host - whatever both parties prefer. Say fond farewells and continue on your hike or
        ride the next day!
      </p>
    </div>
  </section>

  <section class="faq">
    <div class="faq-intro">
      <h1 class="heading-underline">All you need to know</h1>
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
    <div class="partners">
      <h1>Our partners</h1>
    </div>

    <div class="support">
      <h1>Support us</h1>
      <p>
        Welcome to My Garden is free to use but we have to pay a couple of bills. Make a donation to
        keep us going!
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

  .heading-underline {
    position: relative;
  }

  .heading-underline::after {
    position: absolute;
    bottom: -4px;
    left: 0;
    content: '';
    height: 3px;
    background: var(--color-orange);
    width: 120px;
  }

  section {
    margin-bottom: 90px;
  }

  p {
    font-size: 18px;
    line-height: 26px;
    color: var(--color-green);
  }

  .welcome {
    max-width: 650px;
    text-align: center;
    padding-left: 173px;
  }

  .welcome-buttons {
    display: flex;
    flex-direction: column;
  }

  .steps {
    display: flex;
    padding: 0 100px;
  }

  .step {
    text-align: justify;
    margin-right: 68px;
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

  .partners {
    width: 50%;
  }

  .support {
    background-color: var(--color-beige);
    width: 50%;
  }
</style>
