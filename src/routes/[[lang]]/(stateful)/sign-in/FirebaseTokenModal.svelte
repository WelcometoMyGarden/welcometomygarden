<script lang="ts">
  import Button from '$lib/components/UI/Button.svelte';
  import Label from '$lib/components/UI/Label.svelte';
  import Modal from '$lib/components/UI/Modal.svelte';
  import TextInput from '$lib/components/UI/TextInput.svelte';
  import { firebaseCustomToken } from '$lib/stores/auth';
  let { show = $bindable(false) } = $props();

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    $firebaseCustomToken = formData.get('firebase-custom-token')?.toString();
    show = false;
  }
</script>

<Modal bind:show center={true} ariaLabelledBy="title" closeButton={true} cancelButton={true}>
  {#snippet title()}
    <div class="title-section">
      <h2>Fill in the custom token</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <p>
      You've (accidentally?) unlocked a developer debugging feature by clicking certain text on the
      /sign-in page in an alternatingorder.
    </p>
    <p>If you opened this by mistake, please ignore this popup and close it.</p>
    <p>If you keep seeing this without wanting to see it, please let us know as it is a bug.</p>
    <form novalidate onsubmit={submit} style="margin-top: 1rem;">
      <Label labelFor="firebase-custom-token" label="Firebase custom token"></Label>
      <TextInput name="firebase-custom-token" id="firebase-custom-token"></TextInput>
      <Button type="submit" medium>Save</Button>
    </form>
  {/snippet}
</Modal>
