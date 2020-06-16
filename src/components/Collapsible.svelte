<script>
  import { slide } from 'svelte/transition';
  export let onClick = () => (open = !open);
  export let open = false;
  export let id = '';
</script>

<button class="button-container" on:click={onClick}>
  <div class="faq-question" {id}>
    <div class="title">
      <slot name="title" />
    </div>
    <span class="sign">{open ? '-' : '+'}</span>
  </div>
</button>
{#if open}
  <div class="panel" transition:slide={{ duration: 300 }}>
    <div class="content">
      <slot name="content" />
    </div>
  </div>
{/if}

<style>
  .faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
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

    .title {
      padding: 3.5rem 0;
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
