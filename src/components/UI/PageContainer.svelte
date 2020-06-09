<main>
  <slot />
</main>

<style>
  main {
    min-height: calc(100% - var(--height-footer));
    padding: 2rem;
    width: 100%;
    overflow: hidden;
  }

  @media screen and (max-width: 700px) {
    main {
      min-height: calc(100% - var(--height-nav));
      padding-bottom: var(--height-nav);
    }
  }
</style>
