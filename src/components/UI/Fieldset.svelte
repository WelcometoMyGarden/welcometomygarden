<script>
  import Field from './Field.svelte';
  export let name = '';
  export let title = '';
  export let fields = [];
</script>

<fieldset {name}>
  {#if title}
    <h2>{title}</h2>
  {/if}
  {#each fields as field}
    <Field class="field" {...field} bind:value={field.value} />
  {/each}
  <slot />
</fieldset>
