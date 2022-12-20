<script lang="ts">
  export let icon: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let description: string | undefined = undefined;
</script>

<div>
  {#if icon}
    <span class="icon">{icon}</span>
  {/if}
  {#if title}
    <span class="title">{title}</span>
  {/if}
  {#if description}
    <p>{description}</p>
  {/if}
</div>

<style>
  div {
    padding: 4rem;
    border-radius: var(--tile-border-radius);
    display: flex;
    gap: 1rem;
    flex-direction: column;
    border: 2px solid var(--color-beige);
  }

  span.icon {
    font-size: 4rem;
  }

  span.title {
    font-family: var(--fonts-titles);
    font-weight: 700;
    font-size: 2.2rem;
  }
</style>
