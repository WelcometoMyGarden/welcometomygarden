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
    height: 44vh;
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
    /* Make the parent of this component flex on mobile,
        - so we can grow the loader container to the end of the page and not beyond (on mobile, native or not)
        - on the native payment layout, this makes it expand to a full-screen loader */
    :global(.marketing-wrapper) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }
</style>
