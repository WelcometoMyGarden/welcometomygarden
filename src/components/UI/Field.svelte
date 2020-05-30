<script>
  export let label;
  export let help;
  export let type;
  export let placeholder;
</script>

<div class="field">
  {#if label}<label class="label">{label}</label>{/if}
  {#if help}<p class="help">{help}</p>{/if}
  <div class="control">
    <input class="input" type={type} placeholder={placeholder}>
  </div>
</div>