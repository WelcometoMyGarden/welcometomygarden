<script>
  export let value;
  export let group;
  export let id;
  export let name;
  export let label;
  export let disabled = false;
  export let required = true;
</script>

<label for={id}>
  <input type="radio" {name} {id} {required} {disabled} bind:group {value} on:input />
  <span class="text">{label}</span>
</label>

<style>
  label {
    display: flex;
    align-items: center;
    padding: 10px 0;
  }

  .text {
    display: block;
    padding-left: 10px;
    padding-top: 5px;
  }

  input:required {
    box-shadow: none !important;
  }

  input:invalid {
    box-shadow: none !important;
  }
</style>
