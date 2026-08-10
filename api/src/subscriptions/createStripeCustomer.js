const fail = require('../util/fail');
const stripe = require('./stripe');
const { auth, getUserDocRefsWithData } = require('../firebase');
const { coerceToSupportedLanguage } = require('../util/translations');
const { logger } = require('firebase-functions');

/**
 * Creates a customer in stripe
 * @param {{data: {locale: string}, auth?: FV2.CallableRequest<any>['auth']}} request
 */
// The return is consistent. "return true" at the end fixes the ESLint error, but is not reachable.

exports.createStripeCustomer = async ({ data: { locale }, auth: authData }) => {
  if (!auth) {
    return fail('unauthenticated');
  }
  const { uid } = authData ?? {};

  if (!uid) {
    logger.error('Missing uid during Stripe contact creation', authData);
    fail('invalid-argument');
  }

  const { email } = await auth.getUser(uid);

  const { privateUserProfileDocRef, privateUserProfileData, publicUserProfileData } =
    await getUserDocRefsWithData(uid);

  if (!privateUserProfileData || !publicUserProfileData || !privateUserProfileData) {
    logger.error('Missing Firestore account data during Stripe customer creation', { uid });
    fail('internal');
  }

  const fullName = `${publicUserProfileData.firstName} ${privateUserProfileData.lastName}`.trim();

  if (privateUserProfileData.stripeCustomerId) {
    console.error(`User ${uid} already has a Stripe customer`);
    fail('already-exists');
  }

  let customer = null;
  try {
    customer = await stripe.customers.create({
      email,
      name: fullName,
      metadata: {
        wtmg_id: uid
      },
      ...(typeof locale === 'string'
        ? {
            preferred_locales: [coerceToSupportedLanguage(locale)]
          }
        : {})
    });

    // Set customer ID
    await privateUserProfileDocRef.update({ stripeCustomerId: customer.id });

    return customer;
  } catch (e) {
    console.error("Couldn't create a Stripe customer", e);
    fail('internal');
  }
};
