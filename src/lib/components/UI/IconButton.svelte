<script lang="ts">
  import { Icon } from '.';

  interface Props {
    icon: string;
    /** Description of the action for accessibility */
    alt: string;
    width?: string;
    onclick: (e: MouseEvent) => void;
  }

  let { icon, alt, width = '2rem', onclick }: Props = $props();
</script>

<!-- @component Button that only shows an icon -->

<button {onclick} style:width title={alt}>
  <Icon {icon} clickable />
  <!-- Text for accessibility -->
  <span class="screen-reader icon">{alt}</span>
</button>

<style>
  button {
    /* reset */
    all: initial;
    display: inline-block;
  }
</style>
