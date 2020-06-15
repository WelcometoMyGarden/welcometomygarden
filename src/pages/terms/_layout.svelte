<div class="content">
  <slot />
</div>

<style>
  .content {
    display: flex;
    flex-direction: column;
    max-width: 60rem;
    margin: 0 auto;
  }

  .content :global(h2) {
    font-size: 2.4rem;
    line-height: 3.6rem;
    margin: 1.2rem 0 1.6rem 0;
    padding: 1.2rem 0;
    border-bottom: 0.2rem solid var(--color-orange);
  }

  .content :global(h3) {
    font-size: 1.6rem;
    line-height: 3.2rem;
    margin: 1.2rem 0;
  }

  @media screen and (max-width: 700px) {
    .content :global(h2, h3) {
      text-align: center;
    }
  }
</style>
