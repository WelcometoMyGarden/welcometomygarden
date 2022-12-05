import type { Garden } from '$lib/types/Garden';

// eslint-disable-next-line @typescript-eslint/ban-types
type UserOverwritableProps = { [Property in keyof User]: User[Property] extends Function ? never : User[Property] }
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
  superfan?: boolean;
  savedGardens?: string[];

  constructor(user: Partial<UserOverwritableProps> & {displayName?: string}) {
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
    this.superfan = user.superfan || false;
    this.savedGardens = user.savedGardens || [];
  }

  addFields(obj: Partial<UserOverwritableProps>) {
    Object.keys(obj).forEach((prop) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any)[prop] = obj[prop as keyof UserOverwritableProps];
    });
  }

  setGarden(garden: Garden | null) {
    this.garden = garden;
  }

  setEmailPreferences(name: 'newChat' | 'news', pref: boolean) {
    if (this.emailPreferences) {
      this.emailPreferences[name] = pref;
    } else {
      this.emailPreferences = { [name]: pref }
    }
  }
}

export default User;
