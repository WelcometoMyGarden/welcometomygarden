<script>
  import { Avatar } from '@/components/UI';
  export let name;
</script>

<Avatar {name} />
<div class="details">
  <span class="name">{name}</span>
  <slot />
</div>

<style>
  .name {
    font-weight: 700;
  }

  .details {
    margin-left: 1.2rem;
  }
</style>
