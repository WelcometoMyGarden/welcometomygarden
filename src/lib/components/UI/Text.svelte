<script>
  export let is = 'p';
  export let size = 'm';
  export let weight = 'inherit';
  export let className = $$props.class || '';

  const allowedSize = ['s', 'm', 'l'];
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

  .text.s {
    font-size: 1rem;
    line-height: 1;
  }

  .text.m {
    font-size: 1.4rem;
    line-height: 1.4;
  }
  .text.l {
    font-size: 1.8rem;
    line-height: 1.6;
  }

  .text.thin {
    font-weight: normal;
  }
  .text.bold {
    font-weight: bold;
  }
</style>
