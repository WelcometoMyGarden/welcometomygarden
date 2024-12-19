const { db } = require('../firebase');
const { frontendUrl } = require('../sharedConfig');
const fail = require('../util/fail');
const stripe = require('./stripe');

/**
 * @param {FV2.CallableRequest<undefined>} request
 * @returns {Promise<import("stripe").Stripe.BillingPortal.Session>}
 */
exports.createCustomerPortalSession = async (request) => {
  if (!request.auth) {
    fail('unauthenticated');
  }
  const { uid } = request.auth;

  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = await (await privateUserProfileDocRef.get()).data();
  if (!privateUserProfileData.stripeCustomerId) {
    fail('not-found');
  }
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: privateUserProfileData.stripeCustomerId,
    return_url: `${frontendUrl()}/account`
  });

  // https://stripe.com/docs/api/customer_portal/session
  return portalSession;
};
