import { user as userStore } from '@/lib/stores/auth';
import type { Garden } from '$lib/types/Garden';

// eslint-disable-next-line @typescript-eslint/ban-types
type UserOverwritableProps = {
  [Property in keyof User]: User[Property] extends Function ? never : User[Property];
};
type UserProps = Partial<UserOverwritableProps> & { displayName?: string };

export class User {
  id: string;
  uid: string;
  firstName: string;
  lastName?: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  garden: Garden | null;
  emailPreferences?: {
    newChat?: boolean;
    news?: boolean;
  } | null;
  consentedAt?: {
    seconds: number | null;
    nanoseconds: number | null;
  } | null;
  communicationLanguage?: string;
  superfan?: boolean;
  savedGardens?: string[];
  stripeCustomerId?: string;
  stripeSubscription?: {
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
  };

  constructor(user: UserProps) {
    // TYPE TODO: choose one, id or uid
    this.id = user.uid || user.id || '';
    this.uid = user.uid || user.id || '';
    this.firstName = user.firstName || user.displayName || '';
    this.lastName = user.lastName;
    this.email = user.email || '';
    this.emailVerified = user.emailVerified || false;
    this.countryCode = user.countryCode || '';
    this.garden = user.garden || null;
    this.emailPreferences = user.emailPreferences || null;
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
