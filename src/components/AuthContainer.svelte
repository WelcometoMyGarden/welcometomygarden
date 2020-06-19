<div class="wrapper">
  <section>
    <h2 class="title">
      <slot name="title" />
    </h2>
    <div class="form">
      <slot name="form" />
    </div>
    <slot />
  </section>
</div>

<style>
  .wrapper {
    background-color: var(--color-white);
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding-top: 4rem;
    padding-bottom: 4rem;
    width: 100%;
    min-height: calc(100vh - var(--height-footer) - var(--height-nav) - 10rem);
    margin-top: 10rem;
  }

  section {
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
    padding: 0 3rem;
  }

  .title {
    font-size: 1.8rem;
    text-transform: uppercase;
    font-weight: 900;
    margin-bottom: 4rem;
    text-align: center;
  }

  @media (max-width: 850px) {
    .wrapper {
      min-height: calc(100vh - var(--height-footer) - var(--height-nav) - 8rem);
      margin-top: 8rem;
    }
  }

  @media (max-width: 700px) {
    .wrapper {
      min-height: calc(100vh - var(--height-nav));
      margin-top: 0;
    }
  }
</style>
