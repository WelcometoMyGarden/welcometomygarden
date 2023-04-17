const fail = require('../util/fail');
const stripe = require('./stripe');
const { auth, db } = require('../firebase');

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
