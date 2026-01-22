<script lang="ts">
  interface Props {
    length?: number;
  }

  let { length = 6 }: Props = $props();
</script>

<span title="Hidden phone number">🔐 {'⋆'.repeat(length)}</span>

<style>
  span {
    background-color: #eee;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    padding: 0 0.5rem;
  }
</style>
