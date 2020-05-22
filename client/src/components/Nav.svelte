<script>
  import { isActive } from '@sveltech/routify';
</script>

<ul>
  <li>
    <a href="/" class:selected={$isActive('/')}>Home</a>
  </li>
  <li>
    <a href="/login" class:selected={$isActive('/')}>Login</a>
  </li>
</ul>
