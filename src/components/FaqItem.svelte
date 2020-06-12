<script>
  import { slide } from 'svelte/transition';

  let open = false;
  export let isOpen;
  export let onClick;
</script>

<li class="faq-list-item">
  <button class="button-container" on:click={onClick}>
    <div class="faq-question">
      <div class="title">
        <slot name="title" />
      </div>
      <span class="sign">{isOpen ? '-' : '+'}</span>
    </div>
  </button>
  {#if isOpen}
    <div transition:slide={{ duration: 300 }}>
      <div class="content">
        <slot name="content" />
      </div>
    </div>
  {/if}
</li>

<style>
  .faq-list-item {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
    flex: 1;
  }

  .faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .title {
    font-size: 2rem;
    display: flex;
    justify-content: space-between;
    padding: 2rem 0;
    font-weight: 600;
    color: var(--color-green);
  }

  .content {
    font-size: 1.6rem;
    padding: 2rem 0;
    font-weight: normal;
  }

  .sign {
    font-size: 3rem;
    margin-left: auto;
    display: block;
  }

  @media only screen and (max-width: 1150px) {
    .faq-question {
      padding: 0 7.5rem;
    }

    .title {
      font-size: 1.6rem;
      padding: 3.5rem 0;
    }

    .content {
      padding: 0 7.5rem 2.5rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .faq-question {
      padding: 0 4rem;
    }

    .content {
      padding: 0 4rem 2.5rem;
    }
  }
</style>
