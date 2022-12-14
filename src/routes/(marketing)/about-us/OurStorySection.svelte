<script>
  import staticAssetUrl from '$lib/util/staticAssetUrl';
  import PaddedSection from '../_components/PaddedSection.svelte';
  const manonDriesInJapan = staticAssetUrl('/our-story/manon-dries-in-japan.jpg');
  const hosts = staticAssetUrl('/our-story/hosts.jpg');
</script>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <div class="wrapper">
    <div class="section">
      <img src={manonDriesInJapan} alt="Manon & Dries with bikes in Japan" />
      <div class="text">
        <h2>Our story</h2>
        <p>
          Hey! We’re Dries and Manon and we’re the proud parents of Welcome To My Garden. In 2019,
          we cycled from Brussels to Tokyo. Over the course of 11 months, we travelled through 21
          countries, and were hosted by countless incredible people along the way.
        </p>
        <p>
          When we arrived back in Belgium, we asked ourselves: how can we make slow travel easier
          and more fun in our own country? On a rainy Sunday afternoon in 2020, Dries set up the
          first version of WTMG. Within two hours, there were 50 gardens on the map - and after two
          weeks, there were 500!<br />We’ve come a long way since then: today, WTMG counts 30.000+
          users and 4000+ gardens. It’s clear we’re here to stay! And it’s time to step up. We’ve
          listened to you, our community, and we’re now investing in making WTMG meet all your slow
          travel needs.
        </p>
        <p>
          When we arrived back in Belgium, we asked ourselves: how can we make slow travel easier
          and more fun in our own country? On a rainy Sunday afternoon in 2020, Dries set up the
          first version of WTMG. Within two hours, there were 50 gardens on the map - and after two
          weeks, there were 500!
        </p>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="text">
      <h2>The bigger picture</h2>
      <p>
        If there’s one thing we’ve learned over the past few years, it’s this: it’s time to slow
        down. This applies to life in general, but also definitely to travel specifically. The
        faster we travel, the more we miss out on. Fast travel generates a lot of CO2 emissions,
        disconnects people from their surroundings, and damages communities. Enter slow travel!
      </p>
      <p>
        And enter WTMG! We are proud to be part of the solution to this global challenge. In two
        years’ time, WTMG has achieved a lot:
      </p>
      <ul>
        <li><span>31.000 users have embarked on a slow travel adventure</span></li>
        <li>
          <span>4.300 warm-hearted hosts have opened up their garden to slow travellers</span>
        </li>
        <li><span>57.000 stay requests have been sent through the WTMG platform</span></li>
        <li>
          <span>
            We started in Belgium but more and more gardens are now also popping up across Europe
            and beyond
          </span>
        </li>
        <li>
          <span>
            We received financial support from partners like Wikimedia Belgium, Grote Routepaden
            vzw, GR Sentiers and Natuurpunt
          </span>
        </li>
      </ul>
    </div>
    <img src={hosts} alt="Two hosts holding a WTMG sign." />
  </div>
</PaddedSection>

<style>
  .wrapper {
    max-width: 100rem;
    margin: auto;
  }
  .section {
    display: flex;
    gap: 7rem;
    align-items: center;
  }

  .section:first-child {
    margin-bottom: 6rem;
  }

  img {
    width: 40%;
    max-width: 44rem;
    border-radius: 2rem;
    aspect-ratio: 4 / 5;
    object-fit: cover;
  }

  ul {
    list-style-type: disc;
    list-style-position: inside;
  }

  li > span {
    padding-left: 0.1rem;
  }
</style>
