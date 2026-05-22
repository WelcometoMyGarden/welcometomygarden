// Helpers that read fields whose location changed in the Stripe Basil API
// (2025-03-31.basil). All of these returned a single shared field on Acacia;
// in Basil they were moved to per-item / parent / payments structures to
// support flexible billing and multi-payment invoices.
//
// https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end
// https://docs.stripe.com/changelog/basil/2025-03-31/adds-new-parent-field-to-invoicing-objects
// https://docs.stripe.com/changelog/basil/2025-03-31/add-support-for-multiple-partial-payments-on-invoices

const stripe = require('./stripe');

/**
 * In Basil, current_period_start/current_period_end moved off the Subscription
 * and onto each SubscriptionItem. We have a single item per WTMG subscription,
 * so we read it from the first item.
 * @param {import('stripe').Stripe.Subscription} subscription
 * @returns {{ currentPeriodStart: number | undefined, currentPeriodEnd: number | undefined }}
 */
exports.getSubscriptionPeriod = (subscription) => {
  const item = subscription.items?.data?.[0];
  return {
    currentPeriodStart: item?.current_period_start,
    currentPeriodEnd: item?.current_period_end
  };
};

/**
 * In Basil, `invoice.subscription` (string id) was replaced by a polymorphic
 * `invoice.parent` field that, for subscription invoices, exposes the id under
 * `parent.subscription_details.subscription`.
 *
 * Accepts an Invoice or the id-less Invoice shape delivered with the
 * `invoice.upcoming` webhook event — only the `parent` field is read.
 * @param {Pick<import('stripe').Stripe.Invoice, 'parent'>} invoice
 * @returns {string | null}
 */
exports.getInvoiceSubscriptionId = (invoice) => {
  const parent = invoice.parent;
  if (parent?.type !== 'subscription_details') return null;
  const sub = parent.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === 'string' ? sub : sub.id;
};

/**
 * In Basil, `invoice.payment_intent` was removed in favour of `invoice.payments`
 * (an array of InvoicePayment objects to support multiple/partial payments).
 * For our single-payment subscription flow we always want the most recently
 * created payment's PaymentIntent.
 *
 * Returns null if no PaymentIntent payment is attached yet (e.g. draft invoice).
 * Accepts an already-expanded invoice or fetches a fresh one with the right
 * expand path.
 *
 * @param {import('stripe').Stripe.Invoice | string} invoiceOrId
 * @returns {Promise<import('stripe').Stripe.PaymentIntent | null>}
 */
exports.getInvoicePaymentIntent = async (invoiceOrId) => {
  /** @type {import('stripe').Stripe.Invoice} */
  let invoice;
  if (typeof invoiceOrId === 'string') {
    invoice = await stripe.invoices.retrieve(invoiceOrId, {
      expand: ['payments.data.payment.payment_intent']
    });
  } else if (!invoiceOrId.payments?.data?.[0]?.payment?.payment_intent) {
    // No expanded payments on the input invoice: re-fetch with the right expand.
    invoice = await stripe.invoices.retrieve(invoiceOrId.id, {
      expand: ['payments.data.payment.payment_intent']
    });
  } else {
    invoice = invoiceOrId;
  }
  // Newest first per Stripe API ordering on lists.
  const piPayment = invoice.payments?.data?.find(
    (p) => p.payment?.type === 'payment_intent' && p.payment.payment_intent
  );
  const pi = piPayment?.payment?.payment_intent;
  if (!pi || typeof pi === 'string') return null;
  return pi;
};

/**
 * Returns the latest Charge that paid (or attempted to pay) an invoice.
 * Used to inspect SEPA mandate details produced by Bancontact/iDEAL charges.
 *
 * Stripe's 4-level expand cap prevents pulling `latest_charge` in the same
 * call as the InvoicePayment's PaymentIntent (that path is already 4 levels:
 * `payments.data.payment.payment_intent`). We resolve the PaymentIntent with
 * `getInvoicePaymentIntent` and then fetch its `latest_charge` separately.
 * @param {string} invoiceId
 * @returns {Promise<import('stripe').Stripe.Charge | null>}
 */
exports.getInvoiceLatestCharge = async (invoiceId) => {
  const pi = await exports.getInvoicePaymentIntent(invoiceId);
  if (!pi) return null;
  if (pi.latest_charge && typeof pi.latest_charge !== 'string') {
    return pi.latest_charge;
  }
  if (typeof pi.latest_charge === 'string') {
    return await stripe.charges.retrieve(pi.latest_charge);
  }
  return null;
};

/**
 * In Basil, `PaymentIntent.invoice` (and `Charge.invoice`) were removed.
 * The InvoicePayment list endpoint is the new way to map a PaymentIntent back
 * to its Invoice.
 * @param {string} paymentIntentId
 * @returns {Promise<import('stripe').Stripe.Invoice | null>}
 */
exports.getInvoiceForPaymentIntent = async (paymentIntentId) => {
  const invoicePayments = await stripe.invoicePayments.list({
    payment: { type: 'payment_intent', payment_intent: paymentIntentId },
    limit: 1
  });
  const invoiceId = invoicePayments.data[0]?.invoice;
  if (!invoiceId) return null;
  const resolvedId = typeof invoiceId === 'string' ? invoiceId : invoiceId.id;
  return await stripe.invoices.retrieve(resolvedId);
};

/**
 * In Basil, `price` and `plan` were removed from invoice line items in favour
 * of a polymorphic `pricing` object. Returns the unit amount (in the smallest
 * currency unit, e.g. cents) for the first line of an invoice.
 *
 * Note: `unit_amount_decimal` is a string in Basil; in Dahlia (stripe-node v21+)
 * it can also be a Stripe.Decimal — both coerce cleanly with Number().
 * @param {import('stripe').Stripe.Invoice} invoice
 * @returns {number | null}
 */
exports.getInvoiceLineUnitAmount = (invoice) => {
  const line = invoice.lines?.data?.[0];
  const decimal = line?.pricing?.unit_amount_decimal;
  if (decimal == null) return null;
  const n = Number(decimal);
  return Number.isFinite(n) ? n : null;
};

/**
 * Returns the client_secret to confirm payment on an invoice from the front-end.
 * In Basil this is exposed via the new `invoice.confirmation_secret` field (and
 * is no longer pulled from the embedded PaymentIntent).
 * https://docs.stripe.com/api/invoices/object#invoice_object-confirmation_secret
 * @param {string} invoiceId
 * @returns {Promise<string | null>}
 */
exports.getInvoiceConfirmationClientSecret = async (invoiceId) => {
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ['confirmation_secret']
  });
  return invoice.confirmation_secret?.client_secret ?? null;
};
