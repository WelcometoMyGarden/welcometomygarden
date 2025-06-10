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

  /* The tag default styles are original styles */
  /* oh classes (original header) are the original styles of the homepage */
  /* mh classes (marketing header) are classes from the
     new Superfan design */

  div :global(.oh1) {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 1.6;
    font-family: var(--fonts-titles);
    margin-bottom: 3.5rem;
    color: var(--color-green);
  }

  div :global(h1),
  div :global(.mh1) {
    font-size: 3.6rem;
    font-weight: bold;
    line-height: 150%;
    font-family: var(--fonts-titles);
    margin-bottom: 3.5rem;
    color: var(--color-green);
  }

  div :global(h2),
  div :global(.mh2) {
    font-size: 3rem;
    font-weight: bold;
    line-height: 150%;
    font-family: var(--fonts-titles);
    margin-bottom: 3.5rem;
    color: var(--color-green);
  }

  div :global(.oh2) {
    font-size: 1.8rem;
    font-weight: bold;
    line-height: 2.8rem;
    font-family: var(--fonts-copy);
    color: var(--color-green);
    text-transform: uppercase;
  }
  div :global(h3),
  div :global(.mh3) {
    font-size: 2.3rem;
    font-weight: bold;
    line-height: 130%;
    font-family: var(--fonts-titles);
    margin-bottom: 1.1rem;
    color: var(--color-green);
  }

  div :global(.oh3) {
    font-size: 1em;
    font-family: var(--fonts-copy);
    line-height: normal;
    font-weight: 600;
    color: var(--color-green);
    margin-bottom: 0;
  }

  div :global(.caption) {
    /* font-family: 'Montserrat'; */
    font-style: normal;
    font-weight: 600;
    font-size: 1.3rem;
    line-height: 135%;
    letter-spacing: 0.1rem;
    text-transform: uppercase;
    color: var(--color-orange);
  }

  @media only screen and (max-width: 1500px) {
    div :global(.oh1) {
      font-size: 3.4rem;
    }
  }

  @media only screen and (max-width: 1300px) {
    div :global(.oh1) {
      font-size: 2.8rem;
    }
  }

  @media only screen and (max-width: 700px) {
    div :global(.oh2) {
      font-size: 1.6rem;
    }
  }

  @media only screen and (max-width: 600px) {
    div :global(.oh1) {
      font-size: 2.2rem;
    }

    div :global(h1),
    div :global(.mh1) {
      font-size: 2.2rem;
      line-height: 180%;
      text-align: center;
    }

    div :global(h3),
    div :global(.mh3) {
      font-size: 1.8rem;
      font-weight: bold;
      line-height: 130%;
    }
  }

  @media only screen and (max-width: 400px) {
    div :global(.oh1) {
      font-size: 1.8rem;
    }

    div :global(h1),
    div :global(.mh1) {
      font-size: 2rem;
      text-align: center;
    }

    div :global(.caption) {
      text-align: center;
      width: 100%;
      font-size: 1.2rem;
      margin-bottom: 0rem;
    }

    div :global(.oh2) {
      font-size: 1.4rem;
    }

    div :global(h2),
    div :global(.mh2) {
      font-size: 1.8rem;
      line-height: 170%;
      text-align: center;
    }
  }

  div :global(section) {
    margin-bottom: 9rem;
  }

  div :global(section:last-child) {
    margin-bottom: 0;
  }

  div :global(p) {
    line-height: 2.6rem;
    color: var(--color-green);
    margin-bottom: 2rem;
  }

  div :global(.heading-underline) {
    position: relative;
  }

  div :global(.heading-underline::after) {
    position: absolute;
    bottom: -4px;
    content: '';
    height: 3px;
    background: var(--color-orange);
    width: 12rem;
  }

  div :global(.heading-underline--center::after) {
    left: 50%;
    margin-left: -6rem;
  }

  div :global(.heading-underline--left::after) {
    left: 0;
  }
</style>
