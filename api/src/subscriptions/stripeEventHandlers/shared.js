const stripe = require('../stripe');

/**
 * Gets the latest charge of a payment_intent event.
 * Returns null if none was found
 * @param {import('stripe').Stripe.Event} event
 * @returns {Promise<import('stripe').Stripe.Charge | null>}
 */
exports.getLatestCharge = async (event) => {
  const paymentIntent = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);

  // https://docs.stripe.com/changelog/2022-11-15
  const usesOldCharges = event.api_version < '2022-11-15';
  // --- Do pre-checks for the usefulness of this event for WTMG ---
  // Make sure charges are listed for the paymentIntent
  // @ts-ignore
  if (
    // @ts-ignore we're handling two API versions gracefully here, but only the new types
    // are available
    (usesOldCharges && !(paymentIntent?.charges?.data instanceof Array)) ||
    (!usesOldCharges && !paymentIntent.latest_charge)
  ) {
    return null;
  }

  /**
   * @type {import('stripe').Stripe.Charge}
   */
  let latestCharge;

  /**
   * @type {string | undefined}
   */
  // @ts-ignore
  const latestChargeId = paymentIntent.latest_charge;

  if (usesOldCharges) {
    [latestCharge] = /** @type {import('stripe').Stripe.Charge[] | undefined} */ (
      // @ts-ignore
      paymentIntent.charges.data.sort((a, b) => b.created - a.created) || []
    );
  } else if (latestChargeId) {
    latestCharge = await stripe.charges.retrieve(latestChargeId);
  }

  return latestCharge ?? null;
};
