<script lang="ts">
  interface Props {
    label: string;
    labelFor?: string | null;
    children?: import('svelte').Snippet;
  }

  let { label, labelFor = null, children }: Props = $props();
</script>

<label for={labelFor}>
  <span class="label-span">{label}</span>
  {@render children?.()}
</label>

<style>
  .label-span {
    display: block;
    padding-bottom: 1rem;
  }
</style>
