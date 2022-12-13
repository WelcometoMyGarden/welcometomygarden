<script>
  import { _ } from 'svelte-i18n';
  import Partner from '@/lib/components/UI/Partner.svelte';
  import partners from '$lib/partners';
</script>

<section class="cooperation" id="cooperation">
  <div class="card cooperation-card partners">
    <h1 class="partner-header heading-underline-center">{$_('index.partners.title')}</h1>
    <div class="partner-logos">
      {#each partners as { name, logo, link } (name)}
        <Partner {name} {logo} {link} />
      {/each}
    </div>
  </div>
</section>

<style>
  .cooperation {
    display: flex;
  }

  .cooperation h1 {
    margin-bottom: 4.6rem;
  }

  .partner-logos {
    display: grid;
    grid-template-columns: 30% 30%;
    justify-content: space-evenly;
    align-items: center;
    row-gap: 3rem;
  }

  .partner-logos :global(:last-child:nth-child(2n - 1)) {
    grid-column: span 2;
  }
  @media only screen and (max-width: 1150px) {
    .cooperation {
      flex-direction: column;
    }

    .cooperation > * {
      width: 100%;
    }

    .cooperation-card {
      padding-top: 10rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .cooperation-card {
      padding: 8rem 8rem 10rem;
    }
  }
  @media only screen and (max-width: 500px) {
    .cooperation-card {
      padding: 8rem 4rem 10rem;
    }
  }
  @media only screen and (max-width: 400px) {
    .cooperation-card {
      padding: 8rem 3rem 10rem;
    }
    .cooperation-card {
      padding: 8rem 3rem 10rem;
    }
  }
</style>
