<script>
  import { _ } from 'svelte-i18n';
  import Partner from '@/lib/components/UI/Partner.svelte';
  import partners from '$lib/partners';
  import PaddedSection from '../_components/PaddedSection.svelte';
</script>

<PaddedSection>
  <div class="wrapper">
    <h2 class="partner-header heading-underline-center">{$_('index.partners.title')}</h2>
    <p>
      These partners helped us get going and believed in Welcome To My Garden right from the start!
    </p>
    <div class="partner-logos">
      {#each partners as { name, logo, link } (name)}
        <Partner {name} {logo} {link} />
      {/each}
    </div>
  </div>
</PaddedSection>

<style>
  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .partner-logos {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .partner-logos :global(.partner-link) {
    flex: 0 1;
  }
</style>
