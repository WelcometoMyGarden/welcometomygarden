import type { Garden } from '$lib/types/Garden';
import type { Timestamp } from 'firebase/firestore';

type UserOverwritableProps = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Property in keyof User]: User[Property] extends Function ? never : User[Property];
};
type UserProps = Partial<UserOverwritableProps> & { displayName?: string };

type StripeSubscription = {
  id: string;
  priceId: string;
  // https://stripe.com/docs/api/subscriptions/object#subscription_object-status
  status:
    | 'active'
    | 'past_due'
    | 'unpaid'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing';
  // https://stripe.com/docs/api/invoices/object#invoice_object-status
  latestInvoiceStatus: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  /** Date when the subscription was first created. Date since Unix epoch in seconds */
  startDate: number;
  /** Date since Unix epoch in seconds */
  currentPeriodStart: number;
  /** Date since Unix epoch in seconds */
  currentPeriodEnd: number;
  /** When this subscription is scheduled to be canceled. Date since Unix epoch in seconds */
  cancelAt: number;
  /** Date since Unix epoch in seconds */
  canceledAt: number;
  /** Whether the last invoice payment is approved, but still processing */
  paymentProcessing?: boolean;
  /**
   * The last (currently relevant)
   * To be shown until 7 days after the currentPeriodStart, if the latest invoice status is not paid.
   */
  renewalInvoiceLink: string | undefined;
};

type EmailPreferences = {
  newChat?: boolean;
  news?: boolean;
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

export class User implements UserPrivate, UserPublic {
  id: string;
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  garden: Garden | null;
  emailPreferences: EmailPreferences;
  consentedAt: Timestamp | null;
  communicationLanguage?: string;
  superfan?: boolean;
  savedGardens?: string[];
  stripeCustomerId?: string;
  stripeSubscription?: StripeSubscription;

  constructor(user: UserProps) {
    // TYPE TODO: choose one, id or uid
    this.id = user.uid || user.id || '';
    this.uid = user.uid || user.id || '';
    this.firstName = user.firstName || user.displayName || '';
    this.lastName = user.lastName || '';
    this.email = user.email || '';
    this.emailVerified = user.emailVerified || false;
    this.countryCode = user.countryCode || '';
    this.garden = user.garden || null;
    this.emailPreferences = user.emailPreferences || {
      newChat: true,
      news: true
    };
    this.consentedAt = user.consentedAt || null;
    this.communicationLanguage = user.communicationLanguage || '';
    this.superfan = user.superfan || false;
    this.savedGardens = user.savedGardens || [];
    this.stripeCustomerId = user.stripeCustomerId;
    this.stripeSubscription = user.stripeSubscription;
  }

  /**
   * Merges the given fields into this object, without creating a new object.
   * @param obj
   */
  addFields(obj: Partial<UserOverwritableProps>) {
    Object.keys(obj).forEach((prop) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any)[prop] = obj[prop as keyof UserOverwritableProps];
    });
  }

  /**
   * Serialize this user to a JSON object
   */
  toJSON(): UserProps {
    return {
      id: this.id,
      uid: this.uid,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      emailVerified: this.emailVerified,
      countryCode: this.countryCode,
      garden: this.garden,
      emailPreferences: this.emailPreferences ? { ...this.emailPreferences } : undefined,
      consentedAt: this.consentedAt,
      communicationLanguage: this.communicationLanguage,
      superfan: this.superfan,
      savedGardens: this.savedGardens,
      stripeCustomerId: this.stripeCustomerId,
      stripeSubscription: this.stripeSubscription ? { ...this.stripeSubscription } : undefined
    };
  }

  /**
   * Copy this user to a new user, overwriting the given fields.
   */
  copyWith(props: Partial<UserProps>) {
    const currentUserProps = this.toJSON();
    const newProps = { ...currentUserProps, ...props };
    return new User(newProps);
  }

  setGarden(garden: Garden | null) {
    this.garden = garden;
  }

  setEmailPreferences(name: 'newChat' | 'news', pref: boolean) {
    if (this.emailPreferences) {
      this.emailPreferences[name] = pref;
    } else {
      this.emailPreferences = { [name]: pref };
    }
  }
}

export default User;
