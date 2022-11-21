<script>
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import notify from '$lib/stores/notification';
  import { verifyPasswordResetCode, applyActionCode } from '@/lib/api/auth';
  import routes from '$lib/routes';

  const mode = $page.url.searchParams.get('mode');
  const oobCode = $page.url.searchParams.get('oobCode');

  if (!mode || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    goto(routes.HOME);
  }

  const handleAction = async () => {
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        goto(routes.RESET_PASSWORD, { email, oobCode });
      } catch (ex) {
        notify.danger($_('auth.password.expired'), 15000);
        goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        notify.success($_('auth.verification.succes'), 8000);
        goto(`${routes.ACCOUNT}?confirmed=true`);
      } catch (ex) {
        if ($user && $user.emailVerified) {
          notify.success($_('auth.verification.refresh'), 12000);
          goto(routes.ACCOUNT);
        } else {
          notify.danger($_('auth.verification.expired'), 15000);
          goto(routes.ACCOUNT);
        }
      }
    }
  };

  handleAction();
</script>
