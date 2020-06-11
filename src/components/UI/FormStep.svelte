<script>
  import { onMount } from 'svelte';
  import Form from './Form.svelte';
  import Field from './Field.svelte';

  export let name = '';
  export let title = '';
  export let submitAction = '';
  export let fields = [];

  let form;
  let isValid = true;

  const handleSubmit = async () => {};
  const validate = e => console.log(e, e.target.validity, e.target.value);
</script>

<form {name} on:submit|preventDefault={handleSubmit} on:changed={validate} on:input={validate}>
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
