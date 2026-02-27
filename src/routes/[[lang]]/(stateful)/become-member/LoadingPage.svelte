<script lang="ts">
  import Spinner from '$lib/components/UI/Spinner.svelte';
  import { _ } from 'svelte-i18n';
</script>

<div class="container">
  <Spinner color="#c1c1c1" fontSize="16px" positioning="minimal" />
  <p class="loading-text">{$_('payment-superfan.payment-section.loading')}</p>
</div>

<style>
  .container {
    flex-grow: 1;
    height: 60vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2rem;
  }
  .loading-text {
    text-align: center;
  }

  @media (max-width: 700px) {
    :global(.marketing-wrapper) {
      height: 100%;
    }

    .container {
      height: 100%;
    }
  }
</style>
