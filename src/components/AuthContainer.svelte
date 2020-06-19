<div class="wrapper">
  <section>
    <h2 class="title">
      <slot name="title" />
    </h2>
    <slot />
  </section>
</div>

<style>
  .wrapper {
    background-color: var(--color-white);
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding-top: 7rem;
    width: 100%;
    height: calc(100vh - var(--height-footer) - var(--height-nav) - 10rem);
    margin-top: 10rem;
  }

  section {
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
    text-align: center;
    padding: 0 4rem;
  }

  .title {
    font-size: 1.8rem;
    text-transform: uppercase;
    font-weight: 900;
    margin-bottom: 2rem;
  }

  @media (max-width: 850px) {
    .wrapper {
      height: calc(100vh - var(--height-footer) - var(--height-nav) - 8rem);
      margin-top: 8rem;
    }
  }

  @media (max-width: 700px) {
    .wrapper {
      height: calc(100vh - var(--height-nav));
      margin-top: 0;
    }
  }
</style>
