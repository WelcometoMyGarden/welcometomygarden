<script lang="ts">
  import Icon from '$lib/components/UI/Icon.svelte';
  import { bookmarkEmptyIcon, routesIcon, trainIcon } from '$lib/images/icons';

  interface Props {
    direction?: 'vertical' | 'horizontal';
    size?: number;
  }

  let { direction = 'vertical', size = 1.2 }: Props = $props();
</script>

<div class="icons" class:horizontal={direction === 'horizontal'} style="--icon-size: {size}rem">
  <Icon icon={routesIcon} />
  <Icon icon={trainIcon} />
  <Icon icon={bookmarkEmptyIcon} />
</div>

<style>
  .icons {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .icons :global(i) {
    width: var(--icon-size);
    height: var(--icon-size);
    margin: 0.4rem 0;
    flex-grow: 1;
  }

  .icons.horizontal {
    flex-direction: row;
    gap: calc(var(--icon-size) / 2);
  }

  .icons.horizontal :global(i) {
    flex-grow: 0;
    margin: 0;
  }
</style>
