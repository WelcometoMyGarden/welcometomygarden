<script lang="ts">
  import { slide } from 'svelte/transition';
  interface Props {
    open?: boolean;
    title?: import('svelte').Snippet;
    content?: import('svelte').Snippet;
  }

  let { open = $bindable(true), title, content }: Props = $props();
</script>

<div class="toggle-able">
  <button class="button-unstyle toggle-item" onclick={() => (open = !open)}>
    <span class="sign">{open ? '−' : '+'}</span>
    <div class="title">
      {@render title?.()}
    </div>
  </button>
  {#if open}
    <div transition:slide={{ duration: 300 }} class="green-border-bottom">
      <div class="content">
        {@render content?.()}
      </div>
    </div>
  {/if}
</div>

<style>
  .toggle-able {
    padding-bottom: 0.6rem;
    color: var(--color-green);
  }
  button {
    padding-bottom: 0.4rem;
  }

  .toggle-item {
    display: flex;
    justify-content: start;
    align-items: center;
    width: 100%;
    text-align: left;
  }

  .title {
    padding-left: 1rem;
    font-weight: 500;
    flex: 1;
    height: 100%;
    width: 100%;
  }

  .content {
    font-weight: normal;
    margin-left: 1rem;
  }

  .sign {
    font-size: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
