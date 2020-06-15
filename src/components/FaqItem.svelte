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
    padding: 0 10rem 2rem 0;
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
    .faq-question {
      padding: 0 12rem;
    }

    .content {
      padding: 0 20rem 4rem 12rem;
    }
  }

  @media only screen and (max-width: 1000px) {
    .faq-question {
      padding: 0 10rem;
    }

    .content {
      padding: 0 16rem 4rem 10rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .faq-question {
      padding: 0 8rem;
    }

    .content {
      padding: 0 12rem 2.5rem 8rem;
    }
  }

  @media only screen and (max-width: 600px) {
    .faq-question {
      padding: 0 4rem;
    }

    .content {
      padding: 0 6rem 2.5rem 4rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .title {
      font-size: 1.4rem;
      line-height: 2.2rem;
    }
  }

  @media only screen and (max-width: 400px) {
    .faq-question {
      padding: 0 3rem;
    }

    .content {
      padding: 0 3rem 2.5rem 3rem;
    }
  }
</style>
