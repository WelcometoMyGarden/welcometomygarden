const { logger } = require('firebase-functions');
const { db } = require('../firebase');
const verifyBySecret = require('../user/verifyBySecret');
const { frontendUrl } = require('../sharedConfig');
const stripe = require('./stripe');
const { urlPathPrefix } = require('../util/translations');
const { parseEmailAuth } = require('../user/util/parseEmailAuth');

/**
 * Handles authenticated subscription-management links from emails.
 *
 * On successful email/secret authentication:
 * - If a manageable (non-canceled) Stripe subscription exists, redirect to a fresh
 *   Stripe Customer Portal session so the user can manage it without logging in.
 * - If the subscription is fully canceled (or no longer retrievable), redirect to
 *   the localized /about-membership page with a `membership-expired` toast.
 *
 * On authentication failure (or when nothing is manageable), redirect to the
 * dedicated /manage-membership-error page.
 *
 * Imported in index, exposed via a Firebase Hosting rewrite (see firebase.json).
 * https://firebase.google.com/docs/functions/http-events
 *
 * @param {FV2.Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
exports.handleManageSubscription = async (req, res) => {
  const { email, secret } = parseEmailAuth(req.query);
  const errorRedirect = () =>
    res.redirect(
      `${frontendUrl()}/manage-membership-error?email=${encodeURIComponent(
        typeof email === 'string' ? email : ''
      )}`
    );

  if (typeof email !== 'string' || typeof secret !== 'string') {
    logger.warn('Manage subscription attempt with a missing email or secret');
    errorRedirect();
    return;
  }

  let uid;
  try {
    uid = await verifyBySecret(email, secret, 'manage-membership');
  } catch (err) {
    logger.warn('Manage subscription authentication failed', {
      email,
      error: err instanceof Error ? err.message : 'unknown'
    });
    errorRedirect();
    return;
  }

  // Authenticated. Load the user's Stripe data.
  const docSnap = await db.collection('users-private').doc(uid).get();
  const data = docSnap.data() ?? {};
  const langPrefix = urlPathPrefix(data.communicationLanguage);
  const subscriptionId = data.stripeSubscription?.id;
  const customerId = data.stripeCustomerId;

  if (!subscriptionId || !customerId) {
    logger.warn('Manage subscription: no Stripe subscription/customer on record', { uid });
    errorRedirect();
    return;
  }

  let subscription = null;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch (err) {
    // E.g. resource_missing: the subscription was fully deleted at Stripe.
    // Should not happen, except perhaps in cleared sandbox environments?
    // Treat this the same as a canceled subscription below.
    logger.warn('Manage subscription: could not retrieve the Stripe subscription', {
      uid,
      subscriptionId,
      error: err instanceof Error ? err.message : 'unknown'
    });
  }

  // Fully canceled (or gone): the user can't manage it anymore.
  // Redirect to the localized about-membership page with an expiry toast.
  if (!subscription || subscription.status === 'canceled') {
    // Stripe timestamps are in seconds. Prefer the live values, fall back to
    // what we last stored, and finally to "now" if nothing is available.
    const endedAtSeconds =
      subscription?.ended_at ?? subscription?.canceled_at ?? data.stripeSubscription?.canceledAt;
    const when = endedAtSeconds
      ? new Date(endedAtSeconds * 1000).toISOString()
      : new Date().toISOString();
    const params = new URLSearchParams({ toast: 'membership-expired', when });
    res.redirect(`${frontendUrl()}${langPrefix}/about-membership?${params.toString()}`);
    return;
  }

  // A manageable subscription exists: open a Stripe Customer Portal session.
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${frontendUrl()}${langPrefix}/account`
  });
  res.redirect(portalSession.url);
};

/**
 * @param {string} email
 * @param {string} [secret]
 */
exports.createCustomerPortalUrl = function (email, secret) {
  const url = new URL(frontendUrl());
  url.pathname = 'manage-membership';
  url.search = `?${new URLSearchParams({
    e: email,
    s: secret ?? ''
  }).toString()}`;
  return url.toString();
};
