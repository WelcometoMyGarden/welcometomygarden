/**
 * Sent when the subscription is successfully started, after the payment is confirmed.
 * Also sent whenever a subscription is changed. For example, adding a coupon, applying a discount, adding an invoice item, and changing plans all trigger this event.
 * @param {*} event
 * @param {*} res
 */
module.exports = async (event, res) => {
  console.log('Handling subscription.updated');
  const subscription = event.data.object;

  // TODO
  if (subscription.status === 'past_due') {
    // TODO send email telling that their subscription will end if they don't renew
    // check settings here https://stripe.com/docs/billing/revenue-recovery
  }

  // Don't do anything for now.
  return res.sendStatus(200);
};
