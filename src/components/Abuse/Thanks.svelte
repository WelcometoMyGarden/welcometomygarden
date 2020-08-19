<script>
  import { Modal, Button } from '../UI/index';
  export let show;
</script>

<Modal bind:show ariaLabelledBy="title" let:ariaLabelledBy maxWidth="500px">
  <div slot="body" role={show ? undefined : 'form'} class="thanks">
    <h2 class="title mb-m" id={ariaLabelledBy}>Thank you for reporting!</h2>
    <p>Your feedback is important. It helps us keep the Welcome To My garden community safe.</p>
  </div>
  <span slot="controls">
    <Button
      uppercase
      on:click={() => {
        show = false;
      }}>
      Oké
    </Button>
  </span>
</Modal>

<style>
  .thanks {
    text-align: center;
    padding: 40px 40px 30px;
  }
</style>
