<script>
  export let label;
  export let help;
  export let type;
  export let placeholder;
  export let required;
</script>

<div class="field">
  {#if label}<label class="label">{label}{#if required}*{/if}</label>{/if}
  {#if help}<p class="help">{help}</p>{/if}
  <div class="control">
    <input class="input" type={type} placeholder={placeholder}>
  </div>
</div>