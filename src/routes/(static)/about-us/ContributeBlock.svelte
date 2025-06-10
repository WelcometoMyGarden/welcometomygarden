<script lang="ts">
  export let title: string;
  export let number: string;
</script>

<div class="block">
  <h3 class="title">{title}</h3>
  <span class="number">{number}</span>
  <span class="description"><slot /></span>
</div>

<style>
  div.block {
    position: relative;
    max-width: 50rem;
    border-radius: 5rem;
    background-color: var(--color-beige-light);
    padding: 3rem 2rem 2rem 2rem;
  }

  span.number {
    top: -2rem;
    left: 2rem;
    position: absolute;
    display: block;
    color: var(--color-orange);
    font-size: 5rem;
    font-weight: bold;
  }

  .description :global(a:link),
  .description :global(a:visited),
  .description :global(a:active) {
    color: var(--color-orange);
    text-decoration: underline;
  }

  .description :global(a:hover) {
    text-decoration: none;
  }
</style>
