<script lang="ts">
  export let icon: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let description: string | undefined = undefined;
  export let backgroundColor: string | undefined = undefined;
  export let label: string | undefined = undefined;
</script>

<div style:background-color={backgroundColor} class:labeled={label} style="">
  {#if label}
    <span class="label">{label}</span>
  {/if}
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
    position: relative;
    padding: 4rem;
    border-radius: var(--tile-border-radius);
    display: flex;
    gap: 1rem;
    flex-direction: column;
    border: 2px solid var(--color-beige);
    flex: 1 0 0;
  }

  .labeled > .label {
    position: absolute;
    top: 0;
    right: var(--tile-border-radius);
    font-size: 1.3rem;
    padding: 1rem;
    color: var(--color-orange-light);
    font-weight: 700;
    background-color: var(--color-pink-light);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  span.icon {
    font-size: 4rem;
  }

  span.title {
    font-family: var(--fonts-titles);
    font-weight: 700;
    font-size: 2.2rem;
    line-height: 1.7;
  }

  @media screen and (max-width: 700px) {
    span.title {
      font-size: 1.8rem;
    }
  }

  @media screen and (max-width: 500px) {
    div {
      padding: 3rem;
    }
  }
</style>
