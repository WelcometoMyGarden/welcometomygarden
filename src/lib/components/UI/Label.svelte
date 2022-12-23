<script lang="ts">
  export let label: string;
  export let labelFor: string | null = null;
</script>

<label for={labelFor}>
  <span class="label-span">{label}</span>
  <slot />
</label>

<style>
  .label-span {
    display: block;
    padding-bottom: 1rem;
  }
</style>
