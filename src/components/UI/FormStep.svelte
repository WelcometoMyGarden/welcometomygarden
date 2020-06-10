<script>
  import Form from './Form.svelte';
  import Field from './Field.svelte';
  export let name = '';
  export let title = '';
  export let fields = [];
</script>

<Form {name}>
  <h1>{title}</h1>
  {#each fields as field}
    <Field {...field} />
  {/each}
  <slot />
</Form>
