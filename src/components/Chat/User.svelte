<script>
  import { Avatar } from '@/components/UI';
  export let name;
</script>

<div class="user">
  <Avatar {name} />
  <div class="details">
    <span class="name">{name}</span>
    <slot />
  </div>
</div>

<style>
  .user {
    display: flex;
    align-items: center;
  }

  .name {
    font-weight: 700;
  }

  .details {
    margin-left: 1.2rem;
  }
</style>
