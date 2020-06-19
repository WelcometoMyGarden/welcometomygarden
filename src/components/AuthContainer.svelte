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
    height: calc(100vh - var(--height-footer) - var(--height-nav) - 12rem);
    margin-top: 12rem;
  }

  section {
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
    text-align: center;
  }

  .title {
    font-size: 1.8rem;
    text-transform: uppercase;
    font-weight: 900;
    margin-bottom: 2rem;
  }
</style>
