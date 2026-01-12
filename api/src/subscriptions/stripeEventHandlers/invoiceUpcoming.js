// https://docs.stripe.com/api/events/types#event_types-invoice.upcoming

const { logger } = require('firebase-functions/v2');
const { isWTMGInvoice } = require('./util');
const stripe = require('../stripe');
const { frontendUrl } = require('../../sharedConfig');
const { sendSubscriptionUpcomingRenewalEmail } = require('../../mail');
const getFirebaseUserId = require('../getFirebaseUserId');
const { getUserDocRefsWithData } = require('../../firebase');

/**
 * Current only purpose handles sending the [WTMG] Renewal 7 days before - Automatic email
 * for WTMG (charge automatically)
 *
 * @param {import('stripe').Stripe.InvoiceUpcomingEvent} event
 * @param {EResponse} res
 * @returns
 */
module.exports = async (event, res) => {
  logger.log('Handling invoice.upcoming', { eventId: event.id });

  // Note: The received Invoice object will not have an invoice ID.
  /** @type {Omit<import('stripe').Stripe.Invoice, "id">} */
  const invoice = event.data.object;
  if (!(await isWTMGInvoice(invoice))) {
    logger.log('Ignoring non-WTMG invoice', {});
    return res.sendStatus(200);
  }

  // Ignore this event for subscriptions that are not automatically charged
  const sub = await stripe.subscriptions.retrieve(/** @type {string}*/ (invoice.subscription));
  if (sub.collection_method !== 'charge_automatically') {
    logger.log('Ignoring upcoming renewal event for non-charge-automatically');
    return res.sendStatus(200);
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: /** @type {string} */ (invoice.customer),
    return_url: `${frontendUrl()}/account`
  });

  // Send the upcoming renewal email ([WTMG] Renewal 7 days before - Automatic)

  // Get public & private data
  const { privateUserProfileData, publicUserProfileData } = await getUserDocRefsWithData(
    await getFirebaseUserId(invoice.customer)
  );

  const price = invoice.lines.data[0]?.price;
  if (!(typeof price?.unit_amount === 'number')) {
    res.status(500);
    return res.send('Missing parameters to send an automatic upcoming subscription renewal email');
  }

  // Get SEPA details
  const paymentMethodId = /** @type {string | null} */ (sub.default_payment_method);
  if (!paymentMethodId) {
    res.status(500);
    return res.send('Unexpectedly missing default payment method on the subscription');
  }

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

  const isSEPA = paymentMethod.type === 'sepa_debit';
  const isCard = paymentMethod.type === 'card';
  if (!(isSEPA || isCard)) {
    res.status(500);
    return res.send(
      "The default payment method is not SEPA debit or card and shouln't be able to generate a renewal invoice"
    );
  }

  /** @type {string | undefined} */
  let last4;
  /** @type {string | undefined} */
  let mandateReference;
  if (isSEPA) {
    if (paymentMethod.sepa_debit.generated_from.charge == null) {
      logger.debug('Retrieving details from a pure SEPA subscription');
      // NOTE: this will be the case if the the subscription was directly started
      // with sepa debit.
      last4 = paymentMethod.sepa_debit.last4;
      const { charge: latestCharge } = await stripe.invoices.retrieve(
        /** @type {string} */ (sub.latest_invoice),
        { expand: ['charge'] }
      );

      // Find the mandate
      const mandateId = /** @type {import('stripe').Stripe.Charge} */ (latestCharge)
        .payment_method_details.sepa_debit.mandate;
      const mandate = await stripe.mandates.retrieve(/** @type {string} */ (mandateId));
      mandateReference = mandate.payment_method_details.sepa_debit.reference;
    } else {
      // If the SEPA debit pm _was_ generated from Bancontact or iDEAL
      const generatingCharge = await stripe.charges.retrieve(
        /** @type {string} */ (paymentMethod.sepa_debit.generated_from.charge)
      );

      if (
        /** @type {string[]} */ (
          /** @satisfies {(keyof import('stripe').Stripe.Charge.PaymentMethodDetails)[]} */ ([
            'bancontact',
            'ideal'
          ])
        ).includes(generatingCharge.payment_method_details.type)
      ) {
        logger.debug(
          `Retrieving details from a SEPA subscription generated from ${generatingCharge.payment_method_details.type}`
        );
        // Generating payment method's details (bancontact or iban)
        const { iban_last4, generated_sepa_debit_mandate } =
          generatingCharge.payment_method_details[
            /** @type {'bancontact' | 'ideal'} */ (generatingCharge.payment_method_details.type)
          ];
        last4 = iban_last4;
        const mandate = await stripe.mandates.retrieve(
          /** @type {string} */ (generated_sepa_debit_mandate)
        );
        // The generated mandate DOES relate to SEPA
        mandateReference = mandate.payment_method_details.sepa_debit.reference;
      } else {
        res.status(500);
        logger.error(
          'Unexpected: the sepa debit payment method was generated from something, but not from Bancontact or iDEAL',
          { generatingChargePMType: generatingCharge.payment_method_details.type }
        );
        return res.send();
      }
    }
  }

  await sendSubscriptionUpcomingRenewalEmail({
    email: invoice.customer_email,
    firstName: publicUserProfileData.firstName,
    price: price.unit_amount / 100,
    language: privateUserProfileData.communicationLanguage,
    portalLink: portalSession.url,
    isSEPA,
    last4,
    mandateReference
  });

  return res.sendStatus(200);
};
