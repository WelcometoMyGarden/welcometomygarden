<script lang="ts">
  import { Icon } from '.';

  interface Props {
    icon: string;
    /** Description of the action for accessibility */
    alt: string;
    iconClass?: string;
    width?: string;
    /**
     * Button type
     */
    type?: HTMLButtonElement['type'];
    onclick: (e: MouseEvent) => void;
  }

  let { icon, alt, iconClass, width = '2rem', type, onclick }: Props = $props();
</script>

<!-- @component Button that only shows an icon -->

<button {type} {onclick} style:width title={alt}>
  <Icon {icon} class={iconClass} clickable />
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
