<script>
  import staticAssetUrl from '$lib/util/staticAssetUrl';
  import PaddedSection from '../_components/PaddedSection.svelte';
  const manonDriesInJapan = staticAssetUrl('/our-story/manon-dries-in-japan.jpg');
  const hosts = staticAssetUrl('/our-story/hosts.jpg');
</script>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <div class="wrapper">
    <img class="our-story" src={manonDriesInJapan} alt="Manon & Dries with bikes in Japan" />
    <h2 class="our-story">Our story</h2>
    <div class="text our-story">
      <p>
        Hey! We’re Dries and Manon and we’re the proud parents of Welcome To My Garden. In 2019, we
        cycled from Brussels to Tokyo. Over the course of 11 months, we travelled through 21
        countries, and were hosted by countless incredible people along the way.
      </p>
      <p>
        When we arrived back in Belgium, we asked ourselves: how can we make slow travel easier and
        more fun in our own country? On a rainy Sunday afternoon in 2020, Dries set up the first
        version of WTMG. Within two hours, there were 50 gardens on the map - and after two weeks,
        there were 500!<br />We’ve come a long way since then: today, WTMG counts 30.000+ users and
        4000+ gardens. It’s clear we’re here to stay! And it’s time to step up. We’ve listened to
        you, our community, and we’re now investing in making WTMG meet all your slow travel needs.
      </p>
      <p>
        When we arrived back in Belgium, we asked ourselves: how can we make slow travel easier and
        more fun in our own country? On a rainy Sunday afternoon in 2020, Dries set up the first
        version of WTMG. Within two hours, there were 50 gardens on the map - and after two weeks,
        there were 500!
      </p>
    </div>
    <h2 class="bigger-picture">The bigger picture</h2>
    <div class="text bigger-picture">
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
    <img class="bigger-picture" src={hosts} alt="Two hosts holding a WTMG sign." />
  </div>
</PaddedSection>

<style>
  .wrapper {
    max-width: 100rem;
    margin: auto;
    display: grid;
    grid-template-rows: auto [heading] auto [textimg] auto [heading2] auto [textimg2];
    grid-template-columns: repeat(5, 1fr);
    column-gap: 3rem;
  }

  h2.our-story {
    grid-row: 1;
    grid-column: 3 / span 3;
  }

  .text.our-story {
    grid-row: 2;
    grid-column: 3 / span 3;
  }

  img.our-story {
    grid-row: 2;
    grid-column: 1 / span 2;
  }

  h2.bigger-picture {
    grid-row: 3;
    grid-column: 1 / span 3;
  }

  .text.bigger-picture {
    grid-row: 4;
    grid-column: 1 / span 3;
  }

  img.bigger-picture {
    grid-row: 4;
    grid-column: 4 / span 2;
  }

  img {
    width: 90%;
    max-width: 44rem;
    border-radius: 2rem;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    align-self: center;
    justify-self: center;
  }

  ul {
    list-style-type: disc;
    list-style-position: inside;
  }

  li > span {
    padding-left: 0.1rem;
  }

  @media only screen and (max-width: 900px) {
    .wrapper {
      grid-template-columns: auto;
      grid-template-rows: auto [h1] auto [img1] auto [txt1] auto [h2] auto [img2] auto [txt2];
    }

    .wrapper > .our-story,
    .wrapper > .bigger-picture {
      grid-column: 1;
    }

    h2.our-story {
      grid-row: 1;
    }

    img.our-story {
      grid-row: 2;
    }

    .text.our-story {
      grid-row: 3;
    }

    h2.bigger-picture {
      grid-row: 4;
    }

    img.bigger-picture {
      grid-row: 5;
    }

    .text.bigger-picture {
      grid-row: 6;
    }

    img {
      aspect-ratio: 4 / 3;
      border-radius: 0;
      max-width: unset;
      width: 100%;
      align-self: stretch;
      padding: 0;
      object-fit: cover;
    }
  }
</style>
