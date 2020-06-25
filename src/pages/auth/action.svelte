<script>
  import { user } from '@/stores/auth';
  import { params, goto } from '@sveltech/routify';
  import notify from '@/stores/notification';
  import { verifyPasswordResetCode, applyActionCode } from '@/api/auth';
  import routes from '@/routes';

  const { mode, oobCode } = $params;

  if (!mode || !oobCode) {
    notify.danger('This page is not accessible without a valid action code');
    $goto(routes.HOME);
  }

  const handleAction = async () => {
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        $goto(routes.RESET_PASSWORD, { email, oobCode });
      } catch (ex) {
        notify.danger('This password reset link has expired. Please request a new one', 15000);
        $goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        notify.success('Your email address was verified successfully!', 8000);
        $goto(`${routes.ACCOUNT}?confirmed=true`);
      } catch (ex) {
        if ($user && $user.emailVerified) {
          notify.success('Your email has already been verified. Please refresh the page.', 12000);
          $goto(routes.ACCOUNT);
        } else {
          notify.danger('This verification link has expired. Please request a new one', 15000);
          $goto(routes.ACCOUNT);
        }
      }
    }
  };

  handleAction();
</script>
