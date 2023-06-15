<script lang="ts">
  import { Icon } from '.';
  export let icon: string;
  /** Description of the action for accessibility */
  export let alt: string;
  export let width = '2rem';
</script>

<!-- @component Button that only shows an icon -->

<button on:click style:width title={alt}>
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
