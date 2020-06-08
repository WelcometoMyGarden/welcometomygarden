<main>
  <slot />
</main>

<style>
  main {
    padding-top: var(--height-nav);
  }

  @media screen and (max-width: 700px) {
    main {
      padding-top: 0;
      padding-bottom: var(--height-nav);
    }
  }
</style>
