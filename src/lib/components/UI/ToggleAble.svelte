<script>
  import { slide } from 'svelte/transition';
  export let open = true;
</script>

<button class="button button-container" on:click={() => (open = !open)}>
  <div class="toggle-item">
    <span class="sign">{open ? '−' : '+'}</span>
    <div class="title">
      <slot name="title" />
    </div>
  </div>
  {#if open}
    <div transition:slide={{ duration: 300 }} class="green-border-bottom">
      <div class="content">
        <slot name="content" />
      </div>
    </div>
  {/if}
</button>

<style>
  .button {
    background-color: transparent;
  }

  .toggle-item {
    display: flex;
    justify-content: start;
    align-items: center;
  }

  .title {
    padding-left: 1rem;
    font-weight: 600;
    flex: 1;
    height: 100%;
    width: 100%;
  }

  .content {
    font-weight: normal;
    margin-left: 1rem;
  }

  .sign {
    font-size: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media only screen and (max-width: 700px) {
    /* .toggle-item {
      padding: 2.4rem 8vw;
    }
    .content {
      margin: 0 16vw 2.4rem 8vw;
    } */
  }
</style>
