import type { FirebaseGarden } from '$lib/types/Garden';
import type { Timestamp } from 'firebase/firestore';
import type Stripe from 'stripe';

type StripeSubscription = {
  id: string;
  priceId: string;
  status: Stripe.Subscription.Status;
  // Note: only since the automic renewal deploy in nov 2025, are latest invoices statuses of
  // subscription deletions synced. For older cancelled subs, they seem "open", but are actually
  // "uncollectible" or "void". For invoices with collection_method === 'charge_automatically', it
  // should always properly set.
  latestInvoiceStatus: Stripe.Invoice.Status;
  /** Date when the subscription was first created. Date since Unix epoch in seconds */
  startDate: number;
  /** Date since Unix epoch in seconds */
  currentPeriodStart: number;
  /** Date since Unix epoch in seconds */
  currentPeriodEnd: number;
  /** When this subscription is scheduled to be canceled. Date since Unix epoch in seconds */
  cancelAt: number;
  /** Date since Unix epoch in seconds
   * > If the subscription has been deleted, then canceled_at inside `customer.subscription.deleted` will be
   *   reflect the date of that deletion. This does generally not end with the subscription period end.
   *   - This could be the time that a forced "now" cancellation happened, e.g. due to customer deletion
   *   - This could be the time that a subscription is automatically deleted due to an unpaid (first) invoice
   * > If the subscription was canceled with cancel_at_period_end,
   * > canceled_at inside `customer.subscription.updated` will reflect the time of the most recent update request,
   * > not the end of the subscription period when the subscription is automatically moved to a canceled state.
   */
  canceledAt: number;
  /** Whether the last invoice payment is approved, but still processing */
  paymentProcessing?: boolean;
  /**
   * The last (currently relevant)
   * To be shown until 7 days after the currentPeriodStart, if the latest invoice status is not paid.
   */
  renewalInvoiceLink: string | undefined;
  /**
   * @since dec 2024
   * If set, it should only be set to 'charge_automatically'. Undefined means that the old default
   * 'send_invoice' is still in place.
   */
  collectionMethod: Stripe.Subscription.CollectionMethod | undefined;
};

export type EmailPreferences = {
  newChat: boolean;
  news: boolean;
};

/**
 * Firebase "users-private" model
 */
export type UserPrivate = {
  // Added during registration, must be non-empty
  lastName: string;
  consentedAt: Timestamp | null;
  emailPreferences: EmailPreferences;
  // The existence of the below properties can not be guaranteed
  // They are added later to the object.
  // see api/src/auth.js
  sendgridId?: string;
  // Note: these language fields are guaranteed to be present for new users since Feb 13th, 2023.
  communicationLanguage?: string;
  creationLanguage?: string;
  stripeCustomerId?: string;
  stripeSubscription?: StripeSubscription;
  /** Internal property to assist in handling an email change across systems. Only writable by the admin sdk. */
  newEmail?: string;
  /** Internal property to assist in the handling of an email recovery across systems. Only writable by the admin sdk. */
  oldEmail?: string;
  /**
   * This was not set before the reference field was added, for those accounts it will be undefined.
   * It should not be null in storage. Either not defined, or a proper string.
   */
  reference?: string;
  /**
   * When the last alert was triggered on whether this user was starting many chats in a short timeframe.
   */
  latestSpamAlertAt?: Timestamp;
  /**
   * A per-user unique key that allows them to take certain actions via email (unsubscribe, request renewal) without logging in.
   * Stored in users-private since May 6th, 2026. Before that it was only in SendGrid. Is has been backfilled, however.
   *
   * May be undefined for older users that don't have a contact in SG, but for all main intents where it is used
   * in emails, it is normally defined.
   */
  secret?: string;
  /**
   * When set, the date/time at which this user's garden should be automatically relisted on the map
   * (the `relistGardens` scheduled function picks these up daily). Normally a 10:00 Europe/Brussels
   * timestamp, but the backend queries a full day range so any time-of-day works.
   *
   * - `undefined`/`null`: no scheduled relist (garden is either listed, or unlisted indefinitely).
   * - `Timestamp`: garden is unlisted and should be relisted on this date.
   *
   * @since 2026-06
   */
  relistGardenAt?: Timestamp | null;
};

/**
 * Firebase "users" model
 */
export type UserPublic = {
  // Added during registration, must be non-empty
  countryCode: string;
  // Added during registration, must be non-empty
  firstName: string;
  // The existence of the below properties can not be guaranteed
  // see api/src/auth.js
  // Empty array if none
  savedGardens?: string[];
  superfan?: boolean;
};

/**
 * The local, in-memory representation of the currently logged-in user.
 *
 * It merges the public (`users/{uid}`) and private (`users-private/{uid}`)
 * Firestore documents, the Firebase Auth record, and the user's garden into a
 * single plain object held by the `user` store. It is intentionally a curated
 * subset of {@link UserPrivate} & {@link UserPublic} — only the fields the app
 * reads locally are surfaced here.
 */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  garden: FirebaseGarden | null;
  emailPreferences: EmailPreferences;
  consentedAt: Timestamp | null;
  communicationLanguage?: string;
  superfan?: boolean;
  savedGardens?: string[];
  stripeCustomerId?: string;
  stripeSubscription?: StripeSubscription;
  relistGardenAt?: Timestamp | null;
};

/**
 * Input to {@link createUser}: any subset of {@link User} fields, plus an
 * optional `displayName` (from the Firebase Auth profile) used as a fallback
 * source for `firstName`.
 */
export type UserProps = Partial<User> & { displayName?: string };

/**
 * Builds a {@link User} from partial data, applying the app's defaults for any
 * missing fields. Use this instead of assembling the object by hand so the
 * defaults (id fallback, default email preferences, …) live in one place.
 */
export const buildUser = (user: UserProps): User => ({
  /**
   * Note: we use `id` instead of `uid` here for consistency with
   * the front-end representation of other Firebase-sourced data types.
   */
  id: user.id ?? '',
  firstName: user.firstName ?? user.displayName ?? '',
  lastName: user.lastName ?? '',
  email: user.email ?? '',
  emailVerified: user.emailVerified ?? false,
  countryCode: user.countryCode ?? '',
  garden: user.garden ?? null,
  emailPreferences: user.emailPreferences ?? {
    newChat: true,
    news: true
  },
  consentedAt: user.consentedAt ?? null,
  communicationLanguage: user.communicationLanguage ?? '',
  superfan: user.superfan ?? false,
  savedGardens: user.savedGardens ?? [],
  stripeCustomerId: user.stripeCustomerId,
  stripeSubscription: user.stripeSubscription,
  relistGardenAt: user.relistGardenAt ?? null
});
