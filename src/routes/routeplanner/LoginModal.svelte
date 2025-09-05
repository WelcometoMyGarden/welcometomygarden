<script lang="ts">
  import { page } from '$app/stores';
  import { Button, Modal } from '$lib/components/UI';
  import createUrl from '$lib/util/create-url';

  export let show: boolean;

  function createSignInURL() {
    const { searchParams, hash } = $page.url;
    // Designates a "member check"
    searchParams.append('m', '1');
    return createUrl('/sign-in', {
      // Retain hash, but add a "member check" parameter
      continueUrl: `/routeplanner?${searchParams.toString()}${hash}`
    });
  }
</script>

<Modal maxWidth="460px" ariaLabel="" bind:show center>
  <div slot="title" class="title">
    <h2 id="Title">Member features</h2>
  </div>
  <div slot="body" class="body">
    <p>This is a feature for WTMG members.</p>
    <Button medium href={createSignInURL()}>Login or become a member</Button>
  </div>
</Modal>

<style>
  p {
    margin-bottom: 1rem;
  }
</style>
