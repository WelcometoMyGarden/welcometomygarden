<script lang="ts">
  import { Button, Modal } from '$lib/components/UI';
  import createUrl from '$lib/util/create-url';

  export let show: boolean;
</script>

<Modal maxWidth="460px" ariaLabel="" bind:show center>
  <div slot="title" class="title">
    <h2 id="Title">Member features</h2>
  </div>
  <div slot="body" class="body">
    <p>This is a feature for WTMG members.</p>
    <Button
      medium
      href={createUrl('/sign-in', {
        continueUrl: '/routeplanner'
      })}>Login or become a member</Button
    >
  </div>
</Modal>

<style>
  p {
    margin-bottom: 1rem;
  }
</style>
