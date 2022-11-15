<script>
  import { _ } from 'svelte-i18n';
  import { user } from '@/stores/auth';
  import { params, goto } from '@roxi/routify';
  import notify from '@/stores/notification';
  import { verifyPasswordResetCode, applyActionCode } from '@/api/auth';
  import routes from '@/routes';

  const { mode, oobCode } = $params;

  if (!mode || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    $goto(routes.HOME);
  }

  const handleAction = async () => {
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        $goto(routes.RESET_PASSWORD, { email, oobCode });
      } catch (ex) {
        notify.danger($_('auth.password.expired'), 15000);
        $goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        notify.success($_('auth.verification.succes'), 8000);
        $goto(`${routes.ACCOUNT}?confirmed=true`);
      } catch (ex) {
        if ($user && $user.emailVerified) {
          notify.success($_('auth.verification.refresh'), 12000);
          $goto(routes.ACCOUNT);
        } else {
          notify.danger($_('auth.verification.expired'), 15000);
          $goto(routes.ACCOUNT);
        }
      }
    }
  };

  handleAction();
</script>
