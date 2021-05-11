<script>
  import { _, locale } from 'svelte-i18n';
  import smoothscroll from 'smoothscroll-polyfill';
  import routes from '@/routes';
  import CollapsibleGroup from '../components/CollapsibleGroup.svelte';
  import { Button, Card, Icon } from '../components/UI';
  import { getArrayFromLocale, transKeyExists } from '@/util';
  import { user } from '@/stores/auth';
  import { calendarIcon, clockIcon } from '@/images/icons';

  import Logo from '../images/logo.svg';
  import LogoWithText from '../images/logo_with_text.svg';
  import welcomeMap from '../images/welcome-map.svg';
  import ArrowDown from '../images/arrow-down.svg';
  import OKLogo from '../images/ok_logo.svg';
  import VGCLogo from '../images/vgc_logo.svg';
  import natuurpuntLogo from '../images/natuurpunt_logo.svg';

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
  <title>{$_('generics.home')} | Welcome To My Garden</title>
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
  {#each steps as { title }, i}
    <div class="step">
      <div class="step-logo">
        {@html stepGraphics[i]}
      </div>
      <h2 class="step-header">{title}</h2>
      <p class="step-text">
        {@html $_(
          `index.steps.${i}.copy`,
          transKeyExists(`index.steps.${i}.add-garden-link-text`)
            ? {
                values: {
                  addGardenLink: `<a href=${routes.ADD_GARDEN}>${$_(
                    `index.steps.${i}.add-garden-link-text`
                  )}</a>`
                }
              }
            : undefined
        )}
      </p>
    </div>
  {/each}
</section>

<section class="slow-travel-mini-festival">
  <div class="stmf-intro">
    <h1 class="stmf-intro-title">{$_('stmf.title')}</h1>
    <p class="stmf-intro-byline">{$_('stmf.description')}</p>
  </div>

  <div class="stmf-columns">
    <div class="stmf-column">
      <div class="stmf-column-header"><h4>{$_('stmf.sections.get-inspired')}</h4></div>
      <Card
        languageAbbreviation="EN"
        src="images/workshops/the-1001-ways-of-slow-travelling.png"
        date="3 June 2021"
        time="19:00 - 20:30"
        title="The 1001 ways of slow travelling"
        href="https://1001ways.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header"><h4>{$_('stmf.sections.plan')}</h4></div>
      <Card
        languageAbbreviation="NL"
        src="/images/workshops/creeer-je-eigen-route-praktische-tips-tools.png"
        date="8 June 2021"
        time="19:00 - 20:30"
        title="Creëer je eigen route: praktische tips & tools"
        href="https://eigenroute.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="FR"
        src="/images/workshops/creer-ton-propre-itineraire-conseils-pratiques-outils.png"
        date="10 June 2021"
        time="19:00 - 20:30"
        title="Créer ton propre itinéraire: conseils pratiques & outils"
        href="https://propreitineraire.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/create-your-own-itinerary-practical-tips-tools.png"
        date="15 June 2021"
        time="19:00 - 20:30"
        title="Create your own itinerary: practical tips & tools"
        href="https://ownitinerary.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header"><h4>{$_('stmf.sections.contribute')}</h4></div>
      <Card
        group="Beginner"
        languageAbbreviation="EN"
        src="/images/workshops/collect-data-and-improve-maps-while-slow-travelling-introduction-to-openstreetmap.png"
        date="17 June 2021"
        time="19:00 - 20:30"
        title="Collect data and improve maps while slow travelling: Introduction to OpenStreetMap"
        href="https://openstreetmap-beginner.eventbrite.be/?aff=Website"
      />
      <Card
        group="Advanced"
        languageAbbreviation="EN"
        src="/images/workshops/collect-data-and-improve-maps-while-slow-travelling-introduction-to-openstreetmap.png"
        date="22 June 2021"
        time="19:00 - 20:30"
        title="Collect data and improve maps while slow travelling: Introduction to OpenStreetMap"
        href="https://openstreetmap-advanced.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/opportunities-of-worlds-biggest-encyclopedia-for-slow-travellers-wikipedia.png"
        date="24 June 2021"
        time="19:00 - 20:30"
        title="Opportunities of world's biggest encyclopedia for slow travellers: Wikipedia"
        href="https://wikipedia-workshop.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header"><h4>{$_('stmf.sections.rethink')}</h4></div>
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/slow-travelling--the-commons-the-role-of-the-welcome-to-my-garden-community.png"
        date="29 June 2021"
        time="19:00 - 20:30"
        title="Slow travelling & the commons: the role of the Welcome To My Garden community"
        href="https://slowtravel-commons.eventbrite.be/?aff=Website"
      />
    </div>
  </div>
</section>

<section class="getInspired">
  <div>
    <div>
      <svg width="33" height="2" viewBox="0 0 66 6" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 3H66" stroke="#495747" stroke-width="5" />
      </svg>
      plan
    </div>
    <h2>create your own itinerary: practical tips &amp; tools <span>en</span></h2>
    <div class="getInspiredFlexH">
      <div class="getInspiredDate">
        <div class="icon">
          <Icon icon={clockIcon} />
        </div>
        <div>15 June 2021</div>
      </div>
      <div class="getInspiredDate">
        <div class="icon">
          <Icon icon={clockIcon} />
        </div>
        <div>19 - 20h30</div>
      </div>
    </div>
    <div class="getInspiredLogo">
      {@html LogoWithText}
    </div>
    <div class="getInspiredFlexH getInspiredPartners">
      <div>
        <img src="images/partners/groteroutepaden.png" alt="groteroutepaden" />
      </div>
      <div>
        <img
          src="images/partners/lessentiersdegrandrandonnee.png"
          alt="lessentiersdegrandrandonnee"
        />
      </div>
    </div>
  </div>
  <figure class="getInspiredImg">
    <img src="https://i.ibb.co/DwpXk0x/mapwithperson.png" alt="person with map" />
  </figure>
</section>

<section class="faq">
  <div class="card faq-intro">
    <h1 class="heading-underline-center">{$_('index.faq.title')}</h1>
    <p>
      {@html $_('index.faq.copy', {
        values: {
          faqLink: `<a href=${routes.FAQ}>${$_(`index.faq.faq-link-text`)}</a>`
        }
      })}
    </p>
  </div>
  <div class="faq-questions">
    <CollapsibleGroup collapsibles={faqQuestions} />
  </div>
</section>

<section class="cooperation">
  <div class="card cooperation-card partners">
    <h1 class="partner-header heading-underline-center">{$_('index.partners.title')}</h1>
    <div class="partner-logos">
      <div class="partner-logo ok-logo">
        <a href="https://be.okfn.org/" class="partner-link">
          {@html OKLogo}
        </a>
      </div>
      <div class="partner-logo vgc-logo">
        <a href="https://www.vgc.be/staycation" class="partner-link">
          {@html VGCLogo}
        </a>
      </div>
      <div class="partner-logo natuurpunt-logo">
        <a href="https://www.natuurpunt.be/" class="partner-link">
          {@html natuurpuntLogo}
        </a>
      </div>
    </div>
  </div>

  <div class="card cooperation-card support">
    <div class="cooperation-content">
      <h1 class="heading-underline-center">{$_('index.support.title')}</h1>
      <p>
        {@html $_('index.support.copy', {
          values: {
            donationLink: `<a href=\"https://opencollective.com/welcometomygarden\" target=\"_blank\" rel=\"noopener noreferrer\">${$_(
              'index.support.donation-link-text'
            )}</a>`
          }
        })}
      </p>
    </div>
  </div>
</section>

<section class="donate-holiday">
  <div class="donate-img-container summer-container">
    <img src="/images/zomer-2020.svg" alt="Zomer van 2020" />
  </div>
  <div class="donate-copy">
    <h1 class="heading-underline-center">{$_('index.holiday-donations.title')}</h1>
    <p>{$_('index.holiday-donations.copy')}</p>
    <Button medium uppercase href="https://dezomervan2020.be/doneer" target="_blank">
      {$_('index.holiday-donations.link-text')}
    </Button>
  </div>
  <div class="donate-img-container">
    <img src="/images/hands-illustration.svg" alt={$_('index.holiday-donations.title')} />
  </div>
</section>

<style>
  h1 {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 9rem;
    font-family: var(--fonts-titles);
    margin-bottom: 3.5rem;
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
    display: grid;
    grid-template-rows: 0.5fr;
    text-align: center;
    width: 50%;
    padding: 10rem;
  }

  .partner-logos {
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .partner-logo {
    width: 30%;
    max-width: 18rem;
  }

  .vgc-logo {
    max-width: 10rem;
  }

  .natuurpunt-logo {
    max-width: 10rem;
  }

  .support {
    background-color: var(--color-beige-light);
  }

  .donate-holiday {
    display: none;
    text-align: center;
    padding: 8rem;
    align-items: center;
  }

  .donate-copy {
    margin: 0 8rem;
  }

  .donate-img-container {
    width: 50rem;
  }

  .donate-img-container img {
    max-width: 100%;
  }

  .slow-travel-mini-festival {
    background-color: var(--color-beige-light);
    text-align: center;
    padding: 8rem;
    align-items: center;
  }

  .stmf-intro-title {
    margin-bottom: 0;
  }

  .stmf-intro-byline {
    text-transform: uppercase;
    font-weight: bold;
    margin-bottom: 3.5rem;
    font-size: 1.8rem;
    line-height: 1.6;
  }

  .stmf-columns {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
  }

  .stmf-column {
    flex: 1 1 10%;
    margin-left: 1rem;
    margin-right: 1rem;
    max-width: 40rem;
  }

  .stmf-column-header {
    background-color: var(--color-green);
    color: var(--color-white);
    border-radius: 0.6rem;
    padding: 0.9rem 0.6rem;
    text-align: center;
    font-size: 1.8rem;
    width: 100%;
    margin-bottom: 1.8rem;
  }

  .getInspired {
    background-color: #e4d290;
    padding-left: 7%;
    display: flex;
  }

  .getInspired div:first-child > div:first-child {
    font-weight: bold;
    margin-bottom: 20px;
    text-transform: uppercase;
  }

  .getInspired svg {
    margin-bottom: 6px;
  }

  .getInspired img {
    height: 100%;
  }

  .getInspiredImg {
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%);
  }

  .getInspired span {
    display: inline-block;
    vertical-align: middle;
    line-height: 3.3rem;
    font-size: 2rem;
    background: #495747;
    color: #fff;
    padding-left: 20px;
    padding-right: 20px;
    border-radius: 40px;
    margin-bottom: 6px;
  }

  .getInspired > div {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    margin-top: 10%;
    margin-right: 5%;
  }

  .getInspired > div > div:first-child {
    font-size: 2rem;
  }

  .getInspiredFlexH {
    display: flex;
  }

  .getInspiredLogo {
    margin-top: 10%;
    text-align: center;
  }

  .getInspiredPartners {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
  }

  .getInspiredPartners img {
    max-height: 70px;
  }

  .getInspired h2 {
    color: #fff;
    line-height: 5rem;
    font-size: 3.5rem;
    font-weight: bold;
    margin-bottom: 30px;
  }

  .getInspired .icon {
    width: 2rem;
    height: 1.5rem;
    margin-top: 2px;
    margin-right: 0px;
  }

  .getInspiredDate {
    display: flex;
    margin-right: 15px;
    font-size: 1.8rem;
    font-weight: bold;
  }

  @media only screen and (max-width: 1500px) {
    .faq-intro {
      padding: 6rem 10rem;
    }
    h1 {
      font-size: 3.4rem;
    }
    .summer-container {
      display: none;
    }
    .donate-copy {
      margin-left: 0;
    }
  }

  @media only screen and (max-width: 1400px) {
    .stmf-column {
      flex: 1 1 50%;
    }
  }

  @media only screen and (max-width: 1300px) {
    h1 {
      font-size: 2.8rem;
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
    .donate-holiday {
      flex-direction: column;
      padding: 3rem;
    }
    .donate-copy {
      margin: 0 0 5rem;
    }

    .getInspired {
      display: none;
    }
  }

  @media only screen and (max-width: 700px) {
    h2 {
      font-size: 1.6rem;
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

    .slow-travel-mini-festival {
      padding: 2rem;
    }
  }

  @media only screen and (max-width: 600px) {
    h1 {
      font-size: 2.2rem;
      line-height: 6.5rem;
    }

    .stmf-intro-byline {
      font-size: 1.6rem;
    }

    .donate-img-container {
      width: 20rem;
    }
  }

  @media only screen and (max-width: 500px) {
    p {
      font-size: 1.4rem;
    }

    .stmf-intro-byline {
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

    .slow-travel-mini-festival {
      padding: 0;
    }
  }

  @media only screen and (max-width: 400px) {
    h1 {
      font-size: 1.8rem;
      line-height: 5.5rem;
    }

    h2 {
      font-size: 1.4rem;
    }

    .landing {
      padding: 6rem 3rem;
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
