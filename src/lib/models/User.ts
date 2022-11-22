import type { Garden } from "$lib/types/Garden";
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
  }
  consendedAt?: {
    seconds: number | null;
    nanoseconds: number | null;
  } | null;

  constructor(user) {
    this.id = user.uid;
    this.uid = user.uid;
    this.firstName = user.firstName || user.displayName;
    this.email = user.email;
    this.emailVerified = user.emailVerified;
    this.countryCode = user.countryCode;
    this.garden = user.garden || null;
  }

  setAllInObject(obj) {
    Object.keys(obj).forEach((prop) => {
      this[prop] = obj[prop];
    });
  }

  setPrivateInformation(info) {
    this.setAllInObject(info);
  }

  setGarden(garden: Garden) {
    this.garden = garden;
  }

  addFields(fields) {
    this.setAllInObject(fields);
  }

  setEmailPreferences(name: "newChat" | "news", pref: boolean) {
    this.emailPreferences[name] = pref;
  }
}

export default User;
