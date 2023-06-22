import type User from '$lib/models/User';
import { superfanLevels } from '../_static/superfan-levels';

export const hasActiveSubscription = (user: User) => {
  // Check object validity
  if (typeof user.stripeSubscription !== 'object' || user.stripeSubscription === null) return false;

  const {
    stripeSubscription: { status: subscriptionStatus, latestInvoiceStatus, paymentProcessing }
  } = user;

  const normallyPaidInvoice = subscriptionStatus === 'active' && latestInvoiceStatus === 'paid';

  const approvedPaymentPending =
    paymentProcessing === true &&
    latestInvoiceStatus === 'open' &&
    (subscriptionStatus === 'past_due' || subscriptionStatus === 'active');

  return normallyPaidInvoice || approvedPaymentPending;
};

export const getSubLevelFromUser = (user: User) => {
  if (hasActiveSubscription(user)) {
    // No need to load stripe, display the status instead.
    return superfanLevels.find(
      (level) => level.stripePriceId === user?.stripeSubscription?.priceId
    );
  }
};

export const getSubLevelBySlug = (slug: string) => {
  return superfanLevels.find((level) => level.slug === slug);
};
