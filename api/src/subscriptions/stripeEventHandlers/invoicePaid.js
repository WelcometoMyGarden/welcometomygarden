const getFirebaseUserId  = require("../getFirebaseUserId");
const { getFirestore } = require('firebase-admin/firestore');
const { sendSubscriptionConfirmationEmail } = require("../../mail");
const db = getFirestore();

/**
 * Mark the user's last invoice as paid
 * Triggers in all cases:
 * 'billing_reason': 'subscription_create', 'subscription_cycle', 'subscription_update', 'subscription_threshold'
 * TODO: Should we check that this _is_ indeed the user's last invoice?
 * @returns
 */
module.exports = async (event, res) => {
  console.log("Handling invoice.paid")
  const invoice = event.data.object;
  const uid = await getFirebaseUserId(invoice.customer)

  // Set the user's latest invoice state
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  await privateUserProfileDocRef.update({
    'stripeSubscription.latestInvoiceStatus': invoice.status
  })

  // Ensure the user is marked as a superfan.
  // (pointless overwrite in case it was already set to true)
  const publicUserProfileDocRef = db.doc(`users/${uid}`)
  const publicUserProfileData = (await publicUserProfileDocRef.get()).data()
  await publicUserProfileDocRef.update({ superfan: true })

  if (invoice.billing_reason = 'subscription_create') {
    sendSubscriptionConfirmationEmail(invoice.customer_email, publicUserProfileData.firstName)
    // this is the paid invoice for the first subscription
    // TODO send a thank you for subscribing email
  }

  return res.sendStatus(200);
}
