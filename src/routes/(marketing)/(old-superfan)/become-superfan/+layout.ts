import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = function load({ params }) {
  const { payment, id } = params;
  const redirectBase = '/become-member';
  let redirectUrl = redirectBase;
  if (payment && id) {
    // Redirect the old superfan tiers: sow (36), plant (60), and grow (120)
    if (id === 'sow') {
      redirectUrl += '/payment';
    } else {
      redirectUrl += '/payment/superfan';
    }
  } else if (payment) {
    redirectUrl += '/payment';
  }

  throw redirect(301, redirectUrl);
};
