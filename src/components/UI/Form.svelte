<script>
  import { createEventDispatcher } from 'svelte';
  import Field from './Field.svelte';

  export let name = '';
  export let title = '';
  export let submitAction = '';
  export let fields = [];

  const dispatch = createEventDispatcher();

  let form;
  let isValid = true;

  const handleSubmit = async () => {
    dispatch('submit', {
      /*
       * Pass only name & value from field
       */
      values: fields.map(field => (field = (({ name, value }) => ({ name, value }))(field)))
    });
  };
</script>

<form {name} on:submit|preventDefault={handleSubmit}>
  {#if title}
    <h1>{title}</h1>
  {/if}
  {#each fields as field}
    <Field class="field" {...field} bind:value={field.value} />
  {/each}
  <slot />
  <input type="submit" value={submitAction || 'Submit'} />
</form>

<style>
  form {
    max-width: 90rem;
  }
</style>
