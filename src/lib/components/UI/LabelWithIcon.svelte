<script lang="ts">
  import { Icon } from '.';
  export let icon: undefined | string = undefined;
  export let labelFor: undefined | string = undefined;
  export let ellipsis = false;
  export let compact = false;
  // Intended for hover states when ellipsis is enabled.
  // TODO: This could be made more accessible.
  export let title: undefined | string = undefined;
</script>

<label for={labelFor} class:compact>
  {#if icon}
    <div class="icon">
      <Icon {icon} />
    </div>
  {/if}
  <span class="label" title={ellipsis ? title : undefined} class:ellipsis><slot /></span>
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
  }

  .label {
    width: 100%;
  }

  .icon {
    height: 2rem;
    width: 2rem;
    padding-right: 0.2rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .icon :global(svg path.cls-1) {
    fill: var(--color-green);
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    .icon {
      margin-right: 0.4rem;
    }
  }
</style>
