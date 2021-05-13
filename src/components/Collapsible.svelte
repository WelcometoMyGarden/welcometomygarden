<script>
  import { slide } from 'svelte/transition';
  export let open = false;
</script>

<button class="button button-container" on:click>
  <div class="collapsible-item">
    <div class="title">
      <slot name="title" />
    </div>
    <span class="sign">{open ? '-' : '+'}</span>
  </div>
  {#if open}
    <div transition:slide={{ duration: 300 }} class="content-container">
      <div class="content">
        <slot name="content" />
      </div>
    </div>
  {/if}
</button>

<style>
  .collapsible-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    color: var(--color-green);
    padding: 2.4rem 4.8rem;
  }

  .content-container{
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  .title {
    font-weight: 600;
    color: var(--color-green);
  }

  .content {
    font-weight: normal;
    padding: 2.4rem 4.8rem;
    max-width: 60rem;
  }

  .sign {
    font-size: 3.2rem;
  }

  @media only screen and (max-width: 700px) {
    .collapsible-item,
    .content {
      padding: 2.4rem 8vw;
    }
  }
</style>
