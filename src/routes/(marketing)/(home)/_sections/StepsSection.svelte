<script>
  import routes from '$lib/routes';
  import { _ } from 'svelte-i18n';
  import { getNodeKeys } from '@/lib/util/get-node-children';
  import Step1 from '$lib/images/home-steps/step-register.svg';
  import Step2 from '$lib/images/home-steps/step-map.svg';
  import Step3 from '$lib/images/home-steps/step-tent.svg';
  const stepGraphics = [Step1, Step2, Step3];
</script>

<section class="steps" id="steps-section">
  {#each getNodeKeys('index.steps') as key, i}
    <div class="step-logo">
      {@html stepGraphics[i]}
    </div>
    <h2 class="oh2 step-header">
      {$_(`index.steps.${key}.title`)}
    </h2>
    <p class="step-text">
      {@html $_(`index.steps.${i}.copy`, {
        values: {
          addGardenLink: `<a href=${routes.ADD_GARDEN}>${$_(
            `index.steps.${i}.add-garden-link-text`
          )}</a>`
        }
      })}
    </p>
  {/each}
</section>

<style>
  .steps {
    padding: 0 10rem;
    display: grid;
    grid-template-rows: 18rem 0.8fr 2fr;
    grid-auto-flow: column;
    column-gap: 5%;
  }

  .steps > * {
    /* Relative to the grid cell */
    max-width: 40rem;
  }

  .step-header {
    font-family: var(--font-copy);
    font-weight: 600;
    align-self: start;
    margin-bottom: 2rem;
  }

  .step-logo {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding-bottom: 2.5rem;
    height: 100%;
    margin: 0 auto;
  }

  .step-logo > :global(svg) {
    max-width: 95%;
    height: min-content;
    max-height: 70%;
  }

  .step-text {
    align-self: start;
  }

  .step-text :global(a),
  .step-text :global(a:visited),
  .step-text :global(a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }
  .step-text :global(a:hover) {
    text-decoration: none;
  }

  @media only screen and (max-width: 1100px) {
    .step-header {
      /* Nicer in French, where around here lines start collapsing */
      text-align: center;
    }
  }

  @media only screen and (max-width: 1000px) {
    .steps {
      /* flex-direction: column; */
      grid-template-columns: 100%;
      grid-template-rows: repeat(3, 18rem auto auto);
      padding: 0 12rem;
      justify-items: center;
    }

    .steps > * {
      /* Relative to the grid cell */
      max-width: 47rem;
    }

    .step-header {
      margin-bottom: 1rem;
    }

    .step-text {
      text-align: center;
    }

    .step-logo :global(svg) {
      max-height: 80%;
      max-width: 24rem;
    }
  }

  @media only screen and (max-width: 1000px) {
    .steps {
      padding: 0 10rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .steps {
      padding: 0 8rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .steps {
      padding: 0 4rem;
    }
  }
  @media only screen and (max-width: 400px) {
    .steps {
      padding: 0 3rem;
    }
  }
</style>
