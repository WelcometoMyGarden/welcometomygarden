<script>
  import { slide } from 'svelte/transition';

  let open = false;

  const toggleOpen = () => (open = !open);
</script>

<li class="faq-list-item">
  <button class="button-container" on:click={toggleOpen}>
    <div class="faq-question">
      <div class="title">
        <slot name="title" />
      </div>
      <span class="sign">{open ? '-' : '+'}</span>
    </div>
  </button>
  {#if open}
    <div transition:slide={{ duration: 300 }}>
      <slot name="content" />
    </div>
  {/if}
</li>

<style>
  li {
    font-weight: 600;
    font-size: 18px;
    color: var(--color-copy);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  .faq-list-item {
    display: flex;
    flex-direction: column;
    padding: 20px 0;
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
  }

  .sign {
    font-size: 3rem;
    margin-left: auto;
    display: block;
  }
</style>
