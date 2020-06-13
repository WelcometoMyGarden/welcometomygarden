<script>
  export let is = 'p';
  export let size = 'm';
  export let weight = 'inherit';
  export let className = $$props.class || '';

  const allowedSize = ['m', 'l'];
  const allowedWeight = ['inherit', 'thin', 'bold'];
  if (!allowedSize.includes(size)) throw new Error('Size props is invalid');
  if (!allowedWeight.includes(weight)) throw new Error('Weight props is invalid');

  let classNames = `text ${className} ${size} ${weight}`;
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

<style>
  .text {
    font-style: normal;
    color: inherit;
    font-weight: inherit;
  }

  .text.m {
    font-size: var(--text-font-size-m);
    line-height: var(--text-line-height-m);
  }
  .text.l {
    font-size: var(--text-font-size-l);
    line-height: var(--text-line-height-l);
  }

  .text.thin {
    font-weight: normal;
  }
  .text.bold {
    font-weight: bold;
  }
</style>
