<script>
  import { fade } from 'svelte/transition';

  export let count = 0;
</script>

{#if count > 0}
  <div transition:fade={{ duration: 200 }}>{count}</div>
{/if}

<!-- @component
    A circular badge to display a count on the right top of a relatively
    positioned box.
    
    Naming reference: https://mui.com/material-ui/react-badge/
-->
<style>
  div {
    position: absolute;
    right: -0.75rem;
    top: -0.75rem;
    display: flex;
    width: 1.5rem;
    height: 1.5rem;
    padding: 1rem;
    justify-content: center;
    align-items: center;
    color: var(--color-white);
    font-size: 1.25rem;
    background-color: var(--color-orange);
    border-radius: 50%;
  }
</style>
