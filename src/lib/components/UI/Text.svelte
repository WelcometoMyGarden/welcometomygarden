<script lang="ts">
  // This temporarily allows us both static checking and runtime checking,
  // until we transferred everything to TypeScript, and we don't need runimte checking anymore.
  // https://stackoverflow.com/questions/40863488/how-can-i-iterate-over-a-custom-literal-type-in-typescript
  const allowedSize = ['s', 'm', 'l'] as const;
  const allowedWeight = ['inherit', 'thin', 'bold', 'w600'] as const;
  type AllowedSize = typeof allowedSize[number];
  type AllowedWeight = typeof allowedWeight[number];

  export let is: 'p' | 'span' | 'h2' = 'p';
  export let size: AllowedSize = 'm';
  export let weight: AllowedWeight = 'inherit';
  export let className = $$props.class || '';

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

  .text.w600 {
    font-weight: 600;
  }
</style>
