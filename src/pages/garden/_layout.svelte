<script>
  import { redirect } from '@sveltech/routify';
  import notify from '@/stores/notification';
  import { user } from '@/stores/auth';
  import routes from '@/routes';

  if (!$user) {
    notify.warning('Please sign in first.', 8000);
    $redirect(routes.SIGN_IN);
  } else if (!$user.emailVerified) {
    notify.warning('Please verify your email first.', 8000);
    $redirect(routes.ACCOUNT);
  }
</script>

{#if $user && $user.emailVerified}
  <slot />
{/if}
