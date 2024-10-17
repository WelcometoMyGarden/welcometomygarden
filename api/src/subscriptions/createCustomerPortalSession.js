const { db } = require('../firebase');
const { frontendUrl } = require('../sharedConfig');
const fail = require('../util/fail');
const stripe = require('./stripe');

exports.createCustomerPortalSession = async (_, context) => {
  if (!context.auth) {
    fail('unauthenticated');
  }
  const { uid } = context.auth;

  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = await (await privateUserProfileDocRef.get()).data();
  if (!privateUserProfileData.stripeCustomerId) {
    fail('not-found');
  }
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: privateUserProfileData.stripeCustomerId,
    return_url: `${frontendUrl()}${frontendUrl().endsWith('/') ? '' : '/'}account`
  });

  // https://stripe.com/docs/api/customer_portal/session
  return portalSession;
};
