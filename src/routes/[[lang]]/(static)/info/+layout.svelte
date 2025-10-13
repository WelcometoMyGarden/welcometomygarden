<div class="info-page">
  <slot />
</div>

<style>
  .info-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    max-width: 92rem;
    padding: 0 2rem;
    margin: 0 auto;
    padding-bottom: 8rem;
  }

  .info-page > :global(.intro) {
    margin: 3.6rem 0;
  }

  .info-page > :global(.intro > h2) {
    font-size: 2.4rem;
    margin: 2rem 0 3rem;
    position: relative;
  }

  .info-page > :global(.intro > h2:after) {
    content: '';
    position: absolute;
    left: 0;
    bottom: -1rem;
    border-radius: 1rem;
    background-color: var(--color-orange);
    width: 12rem;
    height: 0.3rem;
  }

  @media (max-width: 920px) {
    .info-page {
      padding: 0;
    }
    .info-page > :global(.intro) {
      padding: 0 4rem;
      text-align: center;
    }

    .info-page > :global(.intro > h2:after) {
      left: calc(50% - 6rem);
    }
  }
</style>
