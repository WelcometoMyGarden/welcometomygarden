<script>
  import { slide } from 'svelte/transition';
  export let open = false;
  export let id = '';
</script>

<li class="collapsible">
  <button class="button button-container" on:click>
    <div class="collapsible-item" {id}>
      <div class="title">
        <slot name="title" />
      </div>
      <span class="sign">{open ? '-' : '+'}</span>
    </div>
  </button>
  {#if open}
    <div transition:slide={{ duration: 300 }}>
      <div class="content">
        <slot name="content" />
      </div>
    </div>
  {/if}
</li>

<style>
  .collapsible {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    padding: 1.2rem 2.4rem;
  }

  .button {
    flex: 0;
  }

  .collapsible-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .title {
    z-index: -1;
    font-size: 1.6rem;
    display: flex;
    justify-content: space-between;
    padding: 2rem 0;
    font-weight: 600;
    color: var(--color-green);
    margin-right: 2rem;
  }

  .content {
    font-size: 1.6rem;
    padding: 1rem 10rem 2rem 0;
    font-weight: normal;
    text-align: justify;
  }

  .sign {
    font-size: 3rem;
    margin-left: auto;
    display: block;
    color: var(--color-green);
  }

  @media only screen and (max-width: 1150px) {
    .collapsible-item {
      padding: 0 12rem;
    }

    .content {
      padding: 1rem 20rem 2rem 12rem;
    }
  }

  @media only screen and (max-width: 1000px) {
    .collapsible-item {
      padding: 0 10rem;
    }

    .content {
      padding: 1rem 16rem 2rem 10rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .collapsible-item {
      padding: 0 8rem;
    }

    .content {
      padding: 1rem 12rem 2rem 8rem;
    }
  }

  @media only screen and (max-width: 600px) {
    .collapsible-item {
      padding: 0 4rem;
    }

    .content {
      padding: 1rem 6rem 2rem 4rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .title {
      font-size: 1.4rem;
      line-height: 2.2rem;
    }
  }

  @media only screen and (max-width: 400px) {
    .collapsible-item {
      padding: 0 3rem;
    }

    .content {
      padding: 1rem 3rem 2rem 3rem;
    }
  }
</style>
