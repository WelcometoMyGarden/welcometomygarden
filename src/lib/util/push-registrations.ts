import { rootModal } from '$lib/stores/app';
import { bind } from 'svelte-simple-modal';
import ErrorModal, { type Props } from '$lib/components/UI/ErrorModal.svelte';
import { isEnablingLocalPushRegistration } from '$lib/stores/pushRegistrations';
import { get } from 'svelte/store';
import { emailAsLink } from '$lib/constants';
import { t } from 'svelte-i18n';
import { collection, doc, type DocumentReference } from 'firebase/firestore';
import type { CollectionReference } from '@firebase/firestore-types';
import { db } from '$lib/api/firebase';
import { getUser } from '$lib/stores/auth';
import { PUSH_REGISTRATIONS, USERS_PRIVATE } from '$lib/api/collections';
import type {
  FirebaseNativePushRegistration,
  FirebasePushRegistration,
  FirebaseWebPushRegistration,
  LocalPushRegistration
} from '$lib/types/PushRegistration';
import nProgress from 'nprogress';
export { hasWebPushNotificationSupportNow } from './uaInfo';

/**
 * Shows an error in a modal with the given description. Also includes user agent information.
 * @param error
 * @param specifier HTML string, already encapsulated in a <p>
 */
export const handleErrorGeneric = (error: unknown, specifier: string) => {
  rootModal.set(
    bind(ErrorModal, {
      error,
      specifier
    } as Props)
  );
  isEnablingLocalPushRegistration.set(false);
  nProgress.done();
};

/**
 * Displays a general-purpose error message related to notifications, with optional extra info.
 * @param error
 * @param extraInfo HTML
 */
export const handleError = (error: unknown, extraInfo?: string) => {
  const errorModalSpecifier = get(t)('push-notifications.error.generic', {
    values: {
      emailLink: emailAsLink
    }
  });
  handleErrorGeneric(error, `${errorModalSpecifier}${extraInfo ? `<br><br>${extraInfo}` : ''}`);
};

/**
 * Push registrations collection reference
 */
export const pushRegistrationsColRef = () =>
  collection(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS
  ) as unknown as CollectionReference<FirebasePushRegistration, FirebasePushRegistration>;

export const pushRegistrationDocRef = (id: string) =>
  doc(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS,
    id
  ) as DocumentReference<FirebasePushRegistration>;

export const isWebPushRegistration = (
  pr: LocalPushRegistration | undefined | null
): pr is FirebaseWebPushRegistration & { id: string } =>
  pr != null && (pr as any)['subscription'] != null;

export const isNativePushRegistration = (
  pr: LocalPushRegistration | undefined | null
): pr is FirebaseNativePushRegistration & { id: string } =>
  pr != null && typeof (pr as any)['deviceId'] !== 'undefined';
