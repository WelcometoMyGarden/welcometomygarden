import type { Garden } from '$lib/types/Garden';
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

  constructor(user) {
    this.id = user.uid || user.id;
    this.uid = user.uid || user.id;
    this.firstName = user.firstName || user.displayName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.countryCode = user.countryCode;
    this.garden = user.garden || null;
    this.emailPreferences = user.emailPreferences || null;
    this.consentedAt = user.consentedAt || null;
    this.superfan = user.superfan || false;
    this.savedGardens = user.savedGardens || [];
  }

  addFields(obj) {
    Object.keys(obj).forEach((prop) => {
      this[prop] = obj[prop];
    });
  }

  setGarden(garden: Garden | null) {
    this.garden = garden;
  }

  setEmailPreferences(name: 'newChat' | 'news', pref: boolean) {
    this.emailPreferences[name] = pref;
  }
}

export default User;
