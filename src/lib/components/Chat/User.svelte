<script lang="ts">
  import { Avatar } from '$lib/components/UI';
  interface Props {
    name: string;
    seen?: boolean;
    children?: import('svelte').Snippet;
  }

  let { name, seen = true, children }: Props = $props();
</script>

<div class="user">
  <Avatar {name} />
  <div class="details">
    <span class="name" class:seen>{name}</span>
    {@render children?.()}
  </div>
</div>

<style>
  .user {
    display: flex;
    align-items: center;
  }

  .name {
    font-weight: 600;
  }

  .name.seen {
    font-weight: 400;
  }

  .details {
    margin-left: 1.2rem;
  }
</style>
