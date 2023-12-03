<script>
  import { _ } from 'svelte-i18n';
  import Partner from '$lib/components/UI/Partner.svelte';
  import partners from '$lib/partners';
  import PaddedSection from '../_components/PaddedSection.svelte';
</script>

<PaddedSection>
  <div class="wrapper">
    <h2>{$_('about-us.partners-section.title')}</h2>
    <p>{$_('about-us.partners-section.description')}</p>
    <div class="partner-logos">
      {#each partners as { name, logo, link, src } (name)}
        <Partner {name} {logo} {link} {src} />
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
    gap: 2rem;
  }

  .partner-logos :global(.partner-link) {
    flex: 0 1;
  }
</style>
