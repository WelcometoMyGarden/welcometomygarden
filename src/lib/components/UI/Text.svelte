<script lang="ts">
  import type { Snippet } from 'svelte';
  type AllowedSize = 's' | 'm' | 'l';
  type AllowedWeight = 'inherit' | 'thin' | 'bold' | 'w600';

  type Props = {
    is?: 'p' | 'span' | 'h1' | 'h2' | 'h3';
    size?: AllowedSize;
    weight?: AllowedWeight;
    class?: string;
    children: Snippet;
  };

  let {
    is = 'p',
    size = 'm',
    weight = 'inherit',
    class: className = '',
    children
  }: Props = $props();

  let classNames = $derived(`text ${className} ${size} ${weight}`);
</script>

<svelte:element this={is} class={classNames}>
  {@render children?.()}
</svelte:element>

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
