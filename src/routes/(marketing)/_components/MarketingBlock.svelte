<script lang="ts">
  export let backgroundColor: string | undefined = undefined;
  export let centered: boolean | undefined = undefined;
</script>

<div style:background-color={backgroundColor} class:centered>
  <slot />
</div>

<style>
  div {
    width: 100%;
    border-radius: 30px;
    padding: 4rem;
    display: flex;
  }

  div.centered {
    flex-direction: column;
    align-content: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
  }
</style>
