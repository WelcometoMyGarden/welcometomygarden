<script>
  import { _ } from 'svelte-i18n';
  import { Card } from '../UI';
</script>

<section class="slow-travel-mini-festival" id="mini-festival">
  <div class="stmf-intro">
    <h1 class="stmf-intro-title">{$_('stmf.title')}</h1>
    <p class="stmf-intro-byline">{$_('stmf.description')}</p>
  </div>

  <div class="stmf-columns">
    <div class="stmf-column">
      <div class="stmf-column-header">
        <h4>{$_('stmf.sections.get-inspired')}</h4>
      </div>
      <Card
        languageAbbreviation="EN"
        src="images/workshops/the-1001-ways-of-slow-travelling.jpg"
        date="3 June 2021"
        time="19:00 - 20:30"
        title="The 1001 ways of slow travelling"
        href="https://1001ways.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header">
        <h4>{$_('stmf.sections.plan')}</h4>
      </div>
      <Card
        languageAbbreviation="NL"
        src="/images/workshops/creeer-je-eigen-route-praktische-tips-tools.jpg"
        date="8 June 2021"
        time="19:00 - 20:30"
        title="Creëer je eigen route: praktische tips & tools"
        href="https://eigenroute.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="FR"
        src="/images/workshops/creer-ton-propre-itineraire-conseils-pratiques-outils.jpg"
        date="10 June 2021"
        time="19:00 - 20:30"
        title="Créer ton propre itinéraire: conseils pratiques & outils"
        href="https://propreitineraire.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/create-your-own-itinerary-practical-tips-tools.jpg"
        date="15 June 2021"
        time="19:00 - 20:30"
        title="Create your own itinerary: practical tips & tools"
        href="https://ownitinerary.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header">
        <h4>{$_('stmf.sections.contribute')}</h4>
      </div>
      <Card
        group="Beginner"
        languageAbbreviation="EN"
        src="/images/workshops/collect-data-and-improve-maps-while-slow-travelling-introduction-to-openstreetmap-beginner.jpg"
        date="17 June 2021"
        time="19:00 - 20:30"
        title="Collect data and improve maps while slow travelling: Introduction to OpenStreetMap"
        href="https://openstreetmap-beginner.eventbrite.be/?aff=Website"
      />
      <Card
        group="Advanced"
        languageAbbreviation="EN"
        src="/images/workshops/collect-data-and-improve-maps-while-slow-travelling-introduction-to-openstreetmap.jpg"
        date="22 June 2021"
        time="19:00 - 20:30"
        title="Collect data and improve maps while slow travelling: Deep dive into OpenStreetMap"
        href="https://openstreetmap-advanced.eventbrite.be/?aff=Website"
      />
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/opportunities-of-worlds-biggest-encyclopedia-for-slow-travellers-wikipedia.jpg"
        date="24 June 2021"
        time="19:00 - 20:30"
        title="Opportunities of world's biggest encyclopedia for slow travellers: Wikipedia"
        href="https://wikipedia-workshop.eventbrite.be/?aff=Website"
      />
    </div>

    <div class="stmf-column">
      <div class="stmf-column-header">
        <h4>{$_('stmf.sections.rethink')}</h4>
      </div>
      <Card
        languageAbbreviation="EN"
        src="/images/workshops/slow-travelling-the-commons-the-role-of-the-welcome-to-my-garden-community.jpg"
        date="29 June 2021"
        time="19:00 - 20:30"
        title="Slow travelling & the commons: the role of the Welcome To My Garden community"
        href="https://slowtravel-commons.eventbrite.be/?aff=Website"
      />
    </div>
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

  section {
    margin-bottom: 9rem;
  }

  section:last-child {
    margin-bottom: 0;
  }

  p {
    font-size: 1.6rem;
    line-height: 2.6rem;
    color: var(--color-green);
    margin-bottom: 2rem;
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
    margin-bottom: 4rem;
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

  @media only screen and (max-width: 1400px) {
    .stmf-column {
      flex: 1 1 50%;
    }

    .stmf-column:nth-child(2),
    .stmf-column:nth-child(3) {
      order: 1;
    }
  }

  @media only screen and (max-width: 700px) {
    .slow-travel-mini-festival {
      padding: 2rem;
    }
  }

  @media only screen and (max-width: 600px) {
    .stmf-intro-byline {
      font-size: 1.6rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .stmf-intro-byline {
      font-size: 1.4rem;
    }

    .slow-travel-mini-festival {
      padding: 0;
    }
  }
</style>
