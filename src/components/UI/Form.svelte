<script>
  import { createEventDispatcher } from 'svelte';
  import Fieldset from './Fieldset.svelte';
  import Field from './Field.svelte';

  export let name = '';
  export let title = '';
  export let submitAction = '';
  export let fieldsets = [];
  export let fields = [];

  const dispatch = createEventDispatcher();

  let form;
  let isValid = true;

  const handleSubmit = async () => {
    dispatch(
      'submit',
      fieldsets.map(fieldset => {
        return {
          [fieldset.name]: fieldset.fields.map(
            field => (field = (({ name, value }) => ({ [name]: value }))(field))
          )
        };
      })
    );
  };
</script>

<form {name} on:submit|preventDefault={handleSubmit}>
  {#if title}
    <h1>{title}</h1>
  {/if}
  {#each fieldsets as { name, title, fields }}
    <Fieldset {name} {title} {fields} />
  {/each}
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
