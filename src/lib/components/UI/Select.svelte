<script lang="ts">
  // your script goes here
  export let name: string;
  export let value: string | null | undefined;
  export let transparent = false;
  export let globe = false;
  export let fullBlock = false;
</script>

<select {name} id={name} bind:value on:change class:transparent class:globe class:fullBlock
  ><slot /></select
>

<style>
  select {
    -moz-appearance: none;
    -webkit-appearance: none;
    appearance: none;
    font-size: 1.6rem;
    padding: 1rem 2rem 1rem 1rem;
    cursor: pointer;
    text-align: left;
    border-radius: 0.6rem;

    /* Reset Safari User Agent blue */
    color: var(--color-green);

    /* Shows a drop-down caret on the right */
    background-image: url(/images/icons/caret-down.svg);
    background-repeat: no-repeat;
    background-position: right 0.7rem top 50%;
    background-size:
      0.65em auto,
      100%;
  }

  /* Shows drop-down caret on the right, and globe on the left */
  .globe {
    background-image: url(/images/icons/globe.svg), url(/images/icons/caret-down.svg);
    background-position:
      left center,
      right 0.7rem top 50%;
    background-size:
      2rem auto,
      0.65em auto,
      100%;
  }

  .transparent {
    padding: 0 2rem 0 2.5rem;
    background-color: transparent;
    border: 0;
    outline: 0;
  }

  .fullBlock {
    display: block;
    width: 100%;
  }

  /* Hide default select arrow on IE11 and Edge */
  select::-ms-expand {
    display: none;
  }

  @media screen and (max-width: 700px) {
    select {
      font-size: 1.4rem;
    }
  }
</style>
