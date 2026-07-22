<script lang="ts">
  import { Icon } from '.';
  // Intended for hover states when ellipsis is enabled.

  interface Props {
    icon?: undefined | string;
    /**
     * Content rendered before the label as an alternative to `icon`, sharing the
     * same horizontal margin. When set, it takes precedence over `icon`.
     */
    leading?: import('svelte').Snippet;
    /**
     * A form control (e.g. a checkbox/radio `<input>`) rendered *inside* the `<label>`, so
     * clicking anywhere in the label natively toggles it. When set, `labelFor` is dropped;
     * nesting already associates the two.
     */
    input?: import('svelte').Snippet;
    labelFor?: undefined | string;
    ellipsis?: boolean;
    compact?: boolean;
    class?: string;
    // TODO: This could be made more accessible.
    title?: undefined | string;
    children?: import('svelte').Snippet;
    hoverStyle?: boolean;
  }

  let {
    icon = undefined,
    leading = undefined,
    input = undefined,
    labelFor = undefined,
    ellipsis = false,
    compact = false,
    title = undefined,
    class: className,
    hoverStyle = false,
    children
  }: Props = $props();
</script>

<label
  for={input ? undefined : labelFor}
  class={['label-with-icon', { ...(className ? { [className]: true } : {}), compact, hoverStyle }]}
>
  {@render input?.()}
  {#if leading}
    <div class="leading">{@render leading()}</div>
  {:else if icon}
    <div class="icon">
      <Icon {icon} />
    </div>
  {/if}
  <span class="label" title={ellipsis ? title : undefined} class:ellipsis
    >{@render children?.()}</span
  >
</label>

<style>
  label {
    background-image: var(--icon);
    background-position: left center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    cursor: pointer;
    min-width: 0;
    flex-grow: 1;
    font-size: var(--controls-font-size);
    padding: 0.2rem 0;
    margin: 0.1rem 0;
  }

  label :global(input) {
    cursor: pointer;
    margin-right: 0.6rem;
  }

  label.hoverStyle {
    border-radius: 0.4rem;
  }
  @media (any-hover: hover) {
    label.hoverStyle:hover {
      background-color: var(--color-gray-bg);
    }
  }

  .label {
    width: 100%;
    line-height: 1.05;
  }

  .icon,
  .leading {
    margin: 0 0.5rem;
  }

  .icon {
    height: 2rem;
    width: 2rem;
    min-height: 2rem;
    min-width: 2rem;
    padding-right: 0.2rem;
    display: inline-block;
  }

  .leading {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  .icon :global(svg path.cls-1) {
    fill: var(--color-green);
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    /* In combination with the ellipsis & hidden overflow,
      low character parts from g e.g. might get cut off with line-height: 1*/
    line-height: 1.2;
  }

  .compact .icon {
    width: 2.6rem;
    height: 2.6rem;
  }

  @media screen and (max-width: 700px) {
    .icon {
      height: 3rem;
      width: 3rem;
    }
    .icon,
    .leading {
      margin-right: 0.4rem;
    }
    label {
      margin: var(--controls-vert-margin) 0;
      padding: var(--controls-vert-padding) 0;
    }
    .compact {
      margin: calc(0.5 * var(--controls-vert-margin)) 0;
      padding: calc(0.25 * var(--controls-vert-padding)) 0;
    }
  }
</style>
