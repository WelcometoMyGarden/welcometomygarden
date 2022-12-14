// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore } = require('firebase-admin/firestore');
// eslint-disable-next-line import/no-unresolved
const { getAuth } = require('firebase-admin/auth');
const fail = require('../util/fail');
const stripe = require('./stripe');

const db = getFirestore();
const auth = getAuth();

/**
 * Creates a customer in stripe
 */
exports.createStripeCustomer = async (_, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }
  const { uid } = context.auth;

  const { email } = await auth.getUser(uid);

  const publicUserProfileData = (await db.doc(`users/${uid}`).get()).data();
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = await (await privateUserProfileDocRef.get()).data();

  const fullName = `${publicUserProfileData.firstName} ${privateUserProfileData.lastName}`.trim();

  if (privateUserProfileData.stripeCustomerId) {
    console.error(`User ${uid} already has a Stripe customer`);
    fail('already-exists');
  }

  let customer;
  try {
    customer = await stripe.customers.create({
      email,
      name: fullName,
      metadata: {
        wtmg_id: uid
      }
    });

    // Set customer ID
    await privateUserProfileDocRef.update({ stripeCustomerId: customer.id });

    return customer;
  } catch (e) {
    console.error("Couldn't create a Stripe customer", e);
    fail('internal');
  }
  // To make ESLint happy
  return true;
};
