<script lang="ts">
  import { slide } from 'svelte/transition';
  interface Props {
    open?: boolean;
    title?: import('svelte').Snippet;
    content?: import('svelte').Snippet;
    onclick: (e: Event) => void;
  }

  let { open = false, title, content, onclick }: Props = $props();

  // Variation on https://stackoverflow.com/a/21851799/4973029
  // Doesn't trigger a click when the user is selecting text.
  const clickWhenNotSelecting = (node: HTMLElement) => {
    let selection: string | undefined = '';

    const mouseDownListener = () => {
      selection = document.getSelection()?.toString();
    };

    const mouseUpListener = (e: Event) => {
      let newSelection = document.getSelection()?.toString();

      // Only dispatch a click when the selection didn't change.
      if (selection == newSelection) {
        onclick(e);
      }
      selection = newSelection;
    };
    node.addEventListener('mouseup', mouseUpListener);

    return {
      destroy: () => {
        node.removeEventListener('mousedown', mouseDownListener);
        node.removeEventListener('mouseup', mouseUpListener);
      }
    };
  };
</script>

<button class="button button-container" use:clickWhenNotSelecting>
  <div class="collapsible-item" class:green-border-bottom={!open}>
    <div class="title">
      {@render title?.()}
    </div>
    <span class="sign">{open ? '−' : '+'}</span>
  </div>
  {#if open}
    <div transition:slide={{ duration: 300 }} class="green-border-bottom">
      <div class="content">
        {@render content?.()}
      </div>
    </div>
  {/if}
</button>

<style>
  :root {
    --spacing-collapsible-item-hor: 4.8rem;
  }
  .collapsible-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--color-green);
    padding: 2.4rem var(--spacing-collapsible-item-hor);
  }

  .green-border-bottom {
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  .title {
    font-weight: 600;
    color: var(--color-green);
  }

  .content {
    font-weight: normal;
    margin: 0 9.6rem 2.4rem 4.8rem;
    max-width: 70rem;
    user-select: text;
  }

  .sign {
    font-size: 3.2rem;
    margin-left: 4.8rem;
  }

  @media only screen and (max-width: 700px) {
    :root {
      --spacing-collapsible-item-hor: 8vw;
    }

    .collapsible-item {
      padding: 2.4rem var(--spacing-collapsible-item-hor);
    }
    .content {
      margin: 0 16vw 2.4rem 8vw;
    }

    .sign {
      margin-left: 8vw;
    }
  }
</style>
