import type { FieldValue, Timestamp } from 'firebase/firestore';
import type { IOS, IBrowser, IDevice } from 'ua-parser-js';

export enum PushRegistrationStatus {
  /**
   * A live registration. Does not guarantee that it is actually still working/registered.
   */
  ACTIVE = 'active',
  /**
   * Marked for deletion, but couldn't be unsubscribed by the device deleting it.
   * This registration should not be targeted anymore, and should be deleted by the device that can control it.
   */
  MARKED_FOR_DELETION = 'marked_for_deletion'
}

export type FirebasePushRegistration = {
  /**
   * Can be undefined only in pre-release staging environments.
   */
  status: PushRegistrationStatus | undefined;
  /**
   * The Firebase Cloud Messaging registration token.
   */
  fcmToken: string;
  /**
   * The Web Push Subscription underlying the FCM registration.
   * I'm 100% not sure if we can ever leverage this directly without going through FCM,
   * but keeping it gives us a chance, and might help with the identification/refreshing of a registration.
   */
  subscription: PushSubscriptionJSON;
  /**
   * Processed user agent details from the USParser.js v2 library.
   * https://faisalman.github.io/ua-parser-js-docs/v2/intro/why-ua-parser-js.html
   *
   * The goal of this information is to help the user (and us) identify the browser of the registration.
   * We therefore don't store browser/OS versions, or other hard-to-see technical details.
   */
  ua: {
    os: IOS['name'];
    browser: IBrowser['name'];
    device: IDevice;
  };
  /** The host that this subscription was created for. This could be useful when we have multiple apps
   * connecting to the same Firestore. Format without protocol.
   * On localhost testing, it seems that the port matters for Web Push registrations.
   */
  host: string;
  /**
   * The time that this registration was *first* registered.
   * Should be set initially as a server-side timestamp (FieldValue)
   * https://cloud.google.com/firestore/docs/manage-data/add-data#server_timestamp
   */
  createdAt: Timestamp | FieldValue;
  /**
   * The time that this registration was last seen active from the client side.
   * See createdAt.
   * Note: I suppose serverTimestamp() will lead to createdAt.valueOf() === refreshedAt.valueOf(),
   * but I'm not sure.
   */
  refreshedAt: Timestamp | FieldValue;
};

export type LocalPushRegistration = FirebasePushRegistration & { id: string };
