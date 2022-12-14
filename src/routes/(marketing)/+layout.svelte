<div class="marketing-wrapper">
  <slot />
</div>

<style>
  /* Styles to be inherited by all marketing pages and components */

  div :global(.screen-reader-only) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap; /* added line */
    border: 0;
  }

  div :global(h1) {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 9rem;
    font-family: var(--fonts-titles);
    margin-bottom: 3.5rem;
    color: var(--color-green);
  }

  div :global(h2) {
    font-size: 1.8rem;
    font-weight: bold;
    line-height: 2.8rem;
    font-family: var(--fonts-copy);
    color: var(--color-green);
    text-transform: uppercase;
  }

  div :global(h2) {
    font-size: 1.8rem;
    font-weight: bold;
    line-height: 2.8rem;
    font-family: var(--fonts-copy);
    color: var(--color-green);
    text-transform: uppercase;
  }

  @media only screen and (max-width: 1500px) {
    div :global(h1) {
      font-size: 3.4rem;
    }
  }

  @media only screen and (max-width: 1300px) {
    div :global(h1) {
      font-size: 2.8rem;
      line-height: 7.5rem;
    }
  }

  @media only screen and (max-width: 700px) {
    div :global(h2) {
      font-size: 1.6rem;
    }
  }

  @media only screen and (max-width: 600px) {
    div :global(h1) {
      font-size: 2.2rem;
      line-height: 6.5rem;
    }
  }

  @media only screen and (max-width: 500px) {
    div :global(p) {
      font-size: 1.4rem;
    }
  }

  @media only screen and (max-width: 400px) {
    div :global(h1) {
      font-size: 1.8rem;
      line-height: 5.5rem;
    }

    div :global(h2) {
      font-size: 1.4rem;
    }
  }

  div :global(section) {
    margin-bottom: 9rem;
  }

  div :global(section:last-child) {
    margin-bottom: 0;
  }

  div :global(p) {
    font-size: 1.6rem;
    line-height: 2.6rem;
    color: var(--color-green);
    margin-bottom: 2rem;
  }

  div :global(.heading-underline-center) {
    position: relative;
  }

  div :global(.heading-underline-center::after) {
    position: absolute;
    bottom: -4px;
    left: 50%;
    content: '';
    height: 3px;
    background: var(--color-orange);
    width: 12rem;
    margin-left: -6rem;
  }
</style>
