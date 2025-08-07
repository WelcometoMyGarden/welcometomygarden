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
  MARKED_FOR_DELETION = 'marked_for_deletion',
  /**
   * We tried to send a push notification to this registration, but FCM backend returned an error.
   * This most likely means that the FCM token is expired and can not be used anymore. In any case, this push registration should not be targeted.
   * @since 2025-03-11
   */
  FCM_ERRORED = 'fcm_errored'
}

type FirebasePushRegistrationCommon = {
  /**
   * Can be undefined only in pre-release staging environments.
   */
  status: PushRegistrationStatus | undefined;
  /**
   * The Firebase Cloud Messaging registration token.
   * These will expire within 270 days if they are not explicitly unregistered.
   */
  fcmToken: string;
  /**
   * On web, these are  processed user agent details from the USParser.js v2 library.
   * https://faisalman.github.io/ua-parser-js-docs/v2/intro/why-ua-parser-js.html
   *
   * The goal of this information is to help the user (and us) identify the browser of the registration.
   * We therefore don't store browser/OS versions, or other hard-to-see technical details.
   *
   * In native clients, this is coming from the Capacitor getInfo API (except the "type")
   * https://capacitorjs.com/docs/apis/device#getinfo
   */
  ua: {
    os: IOS['name'];
    /**
     * Null in the case of a native device
     */
    browser: IBrowser['name'] | null;
    device: IDevice;
  };
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
  /**
   * The time at which this registration errored in the FCM backend
   * @since 2025-03-11
   */
  erroredAt?: Timestamp | FieldValue;
};

export type FirebaseWebPushRegistration = FirebasePushRegistrationCommon & {
  /**
   * The Web Push Subscription underlying the FCM registration.
   * I'm 100% not sure if we can ever leverage this directly without going through FCM,
   * but keeping it gives us a chance, and might help with the identification/refreshing of a registration.
   */
  subscription: PushSubscriptionJSON;
  /** The host that this subscription was created for. This could be useful when we have multiple apps
   * connecting to the same Firestore. Format without protocol.
   * On localhost testing, it seems that the port matters for Web Push registrations.
   * This does not include the protocol! Also, no trailing slash.
   */
  host: string;
};

export type FirebaseNativePushRegistration = FirebasePushRegistrationCommon & {
  /**
   * The identifier provided by https://capacitorjs.com/docs/apis/device#getid
   */
  deviceId: string | null;
};

export type FirebasePushRegistration = FirebaseWebPushRegistration | FirebaseNativePushRegistration;

export type LocalPushRegistration = FirebasePushRegistration & { id: string };

export type PushSubscriptionPOJO = PushSubscriptionJSON;

export type WebPushSubscriptionCore = {
  fcmToken: string;
  subscription: PushSubscriptionJSON;
};
