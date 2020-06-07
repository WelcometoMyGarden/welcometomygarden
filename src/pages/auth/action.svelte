<script>
  import { params, goto } from '@sveltech/routify';
  import routes from '../../routes';

  const { mode, actionCode } = $params;

  console.log(mode, actionCode);
  if (!mode || !actionCode) {
    // TODO: handle error
    //$goto(routes.HOME);
  }
</script>
