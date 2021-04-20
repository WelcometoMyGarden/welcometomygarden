<script>
  import Collapsible from './Collapsible.svelte';

  export let collapsibles;

  let activeCollapsible = null;
  const setActiveCollapsible = (id) => {
    activeCollapsible === id ? (activeCollapsible = null) : (activeCollapsible = id);
  };
</script>

<div>
  {#each collapsibles as { title, copy }, i}
    <Collapsible on:click={() => setActiveCollapsible(i)} open={activeCollapsible === i}>
      <h3 slot="title">{title}</h3>
      <p slot="content">{copy}</p>
    </Collapsible>
  {/each}
</div>

<style>
  div {
    display: flex;
    flex-direction: column;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }
</style>
