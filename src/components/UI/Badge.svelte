<script>
  import Icon from './Icon.svelte';

  export let icon = '';
</script>

<div class="badge">
  <Icon name={icon} />
  <slot />
</div>

<style type="text/scss">
  @import '../../style/variables';

  .badge {
    display: inline-flex;
    align-items: center;
    background-color: $color-bg-primary;
    border-radius: $radius-xl;
    box-sizing: border-box;
    padding: $spacer-xs $spacer-m;
    margin-top: $spacer-s;
    margin-left: $spacer-s;
  }
</style>
