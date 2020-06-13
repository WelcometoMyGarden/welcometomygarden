<script>
  export let is = 'p';
  export let size = 'm';
  export let weight = 'thin';
  export let className = $$props.class || '';
  export let color = 'green';

  const allowedColor = ['green', 'white'];
  const allowedSize = ['m', 'l'];
  const allowedWeight = ['thin', 'bold'];
  if (!allowedSize.includes(size)) throw new Error('Size props is invalid');
  if (!allowedWeight.includes(weight)) throw new Error('Weight props is invalid');

  let classNames = `${className} ${size} ${weight} ${color}`;
</script>

{#if is === 'p'}
  <p class={classNames}>
    <slot />
  </p>
{:else if is === 'span'}
  <span class={classNames}>
    <slot />
  </span>
{:else if is === 'h2'}
  <h2 class={classNames}>
    <slot />
  </h2>
{/if}

<style type="text/scss">
  @import '../../style/variables';

  p,
  span,
  h2 {
    font-style: normal;

    &.m {
      font-size: $text-font-size-m;
      line-height: $text-line-height-m;
    }
    &.l {
      font-size: $text-font-size-l;
      line-height: $text-line-height-l;
    }

    &.thin {
      font-weight: normal;
    }
    &.bold {
      font-weight: bold;
    }
    &.green {
      color: $color-text;
    }
    &.white {
      color: white;
    }
  }
</style>
