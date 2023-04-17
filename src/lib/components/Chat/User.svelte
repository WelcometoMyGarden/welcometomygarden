<script lang="ts">
  import { Avatar } from '$lib/components/UI';
  export let name: string;
  export let seen = true;
</script>

<div class="user">
  <Avatar {name} />
  <div class="details">
    <span class="name" class:seen>{name}</span>
    <slot />
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
