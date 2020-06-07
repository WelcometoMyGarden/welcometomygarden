<script>
  import { params, goto } from '@sveltech/routify';
  import { verifyPasswordResetCode, applyActionCode } from '../../data/auth';
  import routes from '../../routes';

  const { mode, oobCode } = $params;

  if (!mode || !oobCode) {
    // TODO: handle error
    //$goto(routes.HOME);
  }

  const handleAction = async () => {
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        $goto(routes.RESET_PASSWORD, { email, oobCode });
      } catch (ex) {
        // TODO: verification link expired, prompt to resend
        $goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        // TODO: display success
        $goto(routes.MAP);
      } catch (ex) {
        // TODO: verification link expired, prompt to resend
        $goto(routes.MAP);
      }
    }
  };

  handleAction();
</script>
