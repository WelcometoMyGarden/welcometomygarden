<script>
  import { slide } from 'svelte/transition';

  let open = false;

  const toggleOpen = () => (open = !open);
</script>

<li>
  <button class="faq-item button-container" on:click={toggleOpen}>
    <div class="faq-intro">
      <span class="title">
        <slot name="title" />
      </span>
      <span class="toggle">{open ? '-' : '+'}</span>
    </div>
    {#if open}
      <p transition:slide={{ duration: 300 }}>
        <slot name="content" />
      </p>
    {/if}
  </button>
</li>

<style>
  li {
    font-weight: 600;
    font-size: 18px;
    color: var(--color-copy);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  .title {
    font-size: 2rem;
  }

  .faq-item {
    display: flex;
    flex-direction: column;
    padding: 20px 0;
  }

  .faq-intro {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .toggle {
    font-size: 3rem;
  }
</style>
