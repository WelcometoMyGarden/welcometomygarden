// @ts-check

const { isWTMGInvoice } = require('./util');

/**
 * Handles the `invoice.finalized` event from Stripe
 * @param {*} event
 * @param {*} res
 */
module.exports = async (event, res) => {
  console.log('Handling invoice.finalized');
  const invoice = event.data.object;
  if (!isWTMGInvoice(invoice)) {
    console.log('Ignoring non-WTMG invoice');
    return res.sendStatus(200);
  }
  // TODO send email with the finalized invoice!?
  // see "hosted_invoice_url" and "invoice_pdf"

  // TODO handle invoices that are auto-finalized by stripe
  // after a new cycle collection_method send_invoice cycle starts
  // They don't have billing_reason 'subscription_create'
  // but 'subscription_cycle'
  // Send email, we will disable stripe's emails here.
  if (event.request != null) {
    // we finalized the invoice manually
  }
  // Extract the object from the event.
  // https://stripe.com/docs/api/invoices/object#invoice_object-billing_reason
  if (
    invoice.billing_reason === 'subscription_create' ||
    invoice.metadata.billing_reason_override === 'subscription_create'
  ) {
    // TODO if the invoice was a changed invoice
    // We created the invoice, and are about to finalize it manually.
    // Allow this operation to proceed.
  }
  return res.sendStatus(200);
};
