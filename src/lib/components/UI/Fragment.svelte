<script lang="ts">
  import { type Snippet } from 'svelte';
  let { children }: { children: Snippet; [key: string]: unknown } = $props();
</script>

<!-- @component A "Fragment" component for Svelte 5, rendering its contents
 without adding wrapping HTML elements.

 Can be used to create a conditional wrapper component without repeating inner markup,
 where one wrapper adds wrapping elements, and this one does not.
  -->

{@render children?.()}
