<script>
  import { params, goto } from '@sveltech/routify';
  import notify from '@/stores/notification';
  import {
    verifyPasswordResetCode,
    applyActionCode,
    resendAccountVerification
  } from '../../api/auth';
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
        notify.danger('This password reset link has expired. Please request a new one', 10000);
        $goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        notify.success('Your email address was verified successfully!', 8000);
        $goto(routes.MAP);
      } catch (ex) {
        notify.danger('This verification link has expired. Click to resend', 10000, {
          click: resendAccountVerification
        });
        $goto(routes.MAP);
      }
    }
  };

  handleAction();
</script>
