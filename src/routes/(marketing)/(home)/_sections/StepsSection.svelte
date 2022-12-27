<script>
  import routes from '$lib/routes';
  import { _ } from 'svelte-i18n';
  import { getNodeKeys } from '@/lib/util/get-node-children';
  import Step1 from '$lib/images/step-1.svg';
  import Step2 from '$lib/images/step-2.svg';
  import Step3 from '$lib/images/step-3.svg';
  const stepGraphics = [Step1, Step2, Step3];
</script>

<section class="steps" id="steps-section">
  {#each getNodeKeys('index.steps') as key, i}
    <div class="step">
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
    </div>
  {/each}
</section>

<style>
  .steps {
    display: flex;
    padding: 0 10rem;
    text-align: justify;
    justify-content: space-between;
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
    align-items: center;
    width: 60%;
    height: 15rem;
    margin: 0 auto;
  }

  .step-text :global(a),
  .step-text :global(a:visited),
  .step-text :global(a:active),
  .step-text :global(a:hover) {
    color: var(--color-orange);
    text-decoration: underline;
  }

  .step-logo > :global(svg) {
    max-height: 100%;
    max-width: 100%;
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

    .step {
      margin: 0 auto;
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
