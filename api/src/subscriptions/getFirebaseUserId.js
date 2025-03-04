const { warn } = require('firebase-functions/logger');
const { db } = require('../firebase');
const stripe = require('./stripe');

/**
 * Return the Firebase UID related to a Stripe customer.
 * First tries to retrieve this information from metadata in Stripe.
 * If that fails, this function searches for the customer in Firebase.
 * @param customerId a stripe customer ID
 * @returns {Promise<string | null>} null if no uid was found
 */
module.exports = async (customerId) => {
  const stripeCustomer = await stripe.customers.retrieve(customerId);

  if (stripeCustomer.deleted) {
    // If the customer is deleted
    warn(`The requested customer ${customerId} is deleted`);
    return null;
  }

  // Attempt 1: fetch from the Stripe metadata
  if (stripeCustomer.metadata?.wtmg_id) {
    return /** @type {string} */ (stripeCustomer.metadata.wtmg_id);
  }

  // Attempt 2: query firebase
  warn(
    `Trying to find ${customerId} in Firebase. This shouldn't occur, since ` +
      `the wtmg_id should have been saved in the Stripe customer metadata.`
  );
  const snapshot = await db
    .collection('users-private')
    .where('stripeCustomerId', '==', customerId)
    .limit(1)
    .get();
  const [doc] = snapshot.docs;
  if (doc) {
    // The document's ID is the user's uid
    return doc.id;
  }

  // All methods failed
  return null;
};
