const { getFirestore } = require('firebase-admin/firestore')
const stripe = require('./stripe');
const db = getFirestore();

/**
 * Return the Firebase UID related to a Stripe customer.
 * First tries to retreive this information from metadata in Stripe.
 * If that fails, this function searches for the customer in Firebase.
 * @param customerId a stripe customer ID
 * @returns null if no uid was found
 */
module.exports = getFirebaseUserId = async (customerId) => {
  const stripeCustomer = await stripe.customers.retrieve(customerId)

  // Attempt 1: fetch from the Stripe metadata
  if (stripeCustomer.metadata.wtmg_id) {
    return stripeCustomer.metadata.wtmg_id;
  }

  // Attempt 2: query firebase
  console.warn(
    `Trying to find ${customerId} in Firbase. This shouldn't occur, since `
   + `the wtmg_id should have been saved in the Stripe customer metadata.`
  )
  const snapshot = await db
    .collection('users-private')
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get()
  const [ doc ] = snapshot.docs
  if (doc) {
    // The document's ID is the user's uid
    return doc.id
  }

  // All methods failed
  return null;
}
