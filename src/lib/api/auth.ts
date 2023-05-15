import { get } from 'svelte/store';
import { locale, _ } from 'svelte-i18n';
import {
  applyActionCode as firebaseApplyActionCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type Unsubscribe,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  deleteUser
} from 'firebase/auth';
import { auth, db } from './firebase';
import {
  isRegistering,
  user,
  isInitializingFirebase,
  isUserLoading,
  resolveOnUserLoaded
} from '$lib/stores/auth';
import User, { type UserPrivate, type UserPublic } from '$lib/models/User';
import { createUser, resendAccountVerification as resendAccVerif } from '$lib/api/functions';
import { CAMPSITES, USERS, USERS_PRIVATE } from './collections';
import { doc, DocumentReference, DocumentSnapshot, onSnapshot } from 'firebase/firestore';
import notify from '$lib/stores/notification';
import { goto } from '$app/navigation';
import routes, { getCurrentRoute } from '../routes';
import { page } from '$app/stores';
import { isActiveContains } from '../util/isActive';
import type { Garden } from '../types/Garden';
import type { User as FirebaseUser } from 'firebase/auth';
import trackEvent from '$lib/util/track-event';
import { PlausibleEvent } from '$lib/types/Plausible';

// These are not Svelte stores, because we do not wish to listen to updates on them.
// They are abstracted away by the User store, and trigger updates on that store.
let latestUserPrivateState: UserPrivate | null = null;
let latestUserPublicState: UserPublic | null = null;
let latestAuthUserState: FirebaseUser | null = null;
let latestCampsiteState: Garden | null = null;

/**
 * Creates Firebase observers that manage the app's User model.
 */
export const createAuthObserver = (): Unsubscribe => {
  let unsubscribeFromUserPrivate: (() => void) | null = null;
  let unsubscribeFromUserPublic: (() => void) | null = null;
  let unsubscribeFromCampsite: (() => void) | null = null;

  const unsubscribeFromInnerObserversIfExisting = () => {
    if (unsubscribeFromUserPrivate) {
      unsubscribeFromUserPrivate();
      unsubscribeFromUserPrivate = null;
    }
    if (unsubscribeFromUserPublic) {
      unsubscribeFromUserPublic();
      unsubscribeFromUserPublic = null;
    }
    if (unsubscribeFromCampsite) {
      unsubscribeFromCampsite();
      unsubscribeFromCampsite = null;
    }
  };

  const startLoadingNewUser = () => {
    // Reset caches for all non-auth docs, to prevent user updates from happening.
    // The auth cache is managed by onIdTokenChanged
    resetDocCaches();
    // Unsubscribe from all user-related observers
    unsubscribeFromInnerObserversIfExisting();
    // Set the user to null (log out), if we're not yet logged out.
    // This triggers chat observer cleanup in layout.svelte
    user.set(null);
    // Notify that we're loading a new user
    isUserLoading.set(true);
  };

  let isVerifying = false;

  // We use this listener instead of onAuthStateChanged because we want access to token refresh events.
  // This is useful to fully synchronize the emailVerified state across tabs, without requiring
  // re-login. See code below.
  // https://firebase.google.com/docs/reference/node/firebase.auth.Auth#onidtokenchanged
  const unsubscribeFromAuthObserver = auth().onIdTokenChanged(async (firebaseUser) => {
    console.info('auth/token changed');

    // Update the auth state cache
    latestAuthUserState = firebaseUser;

    const oldStoredUser = get(user);
    if (oldStoredUser == null) {
      console.info('Previous user was null');
    }
    let routeTo: string | null = null;

    let justLoggedIn = false;

    if (firebaseUser) {
      // A user is logged in

      if (oldStoredUser == null) {
        // A new user is loading if the previous user was null, and the next one is not.
        startLoadingNewUser();
        justLoggedIn = true;
      }
      if (oldStoredUser && oldStoredUser.uid !== firebaseUser.uid) {
        console.info('The Firebase account was changed.');
        // A new user is loading if the user was changed.
        startLoadingNewUser();
        justLoggedIn = true;
      }
      // Other cases: the current user was updated with new auth info

      const firebaseUserEmailVerified: boolean = firebaseUser.emailVerified;
      // The token email_verified field is undocumented, but it gets set,
      // and it is used to check whether the email was verified in
      // Firestore (the token gets passed to the Firestore in the backend)
      console.info('User email verified: ', firebaseUserEmailVerified);
      const firebaseTokenEmailVerified: boolean =
        (await firebaseUser.getIdTokenResult()).claims.email_verified ?? false;
      console.info('Token email verified: ', firebaseTokenEmailVerified);

      // emailVerified signals that we have to consider this.
      if (
        // case 1: we logged in into a half-verified account
        // OR case 2: we just did a verification while logged in
        (oldStoredUser == null || !oldStoredUser.emailVerified) &&
        firebaseUserEmailVerified &&
        !firebaseTokenEmailVerified
      ) {
        // When we are loading this page in response to clicking an email verification link, then:
        // - `firebaseUserEmailVerified` will be true
        // - `firebaseTokenEmailVerified` will be false
        // This is counterintuitive, but Firebase does not refresh the auth token (including its emailVerified claims)
        // when a user verifies their email. It is also problematic, because this version of the token is used by
        // Firestore backend checks (see above).
        console.log('Email verified: force refresh token for full sync');
        isVerifying = true;
        // To set firebaseTokenEmailVerified to true, we force-refresh the token.
        // This should re-trigger onIdTokenChanged with true & true
        // **This will also trigger onIdTokenChanged in other open tabs.**
        await firebaseUser.getIdToken(true);
        // Abort, because we know we will restart execution of onIdTokenChanged with new state.
        return;
      } else if (
        // `isVerifying` ensures that this notification is only displayed on a page that
        // previously caused the previous if case to be called.
        // On demo-test, this is the /account page that is loaded from scratch.
        // On staging & production, this is the /auth/action page.
        // Otherwise it would be shown on every new page load of a fully verified user.
        isVerifying &&
        firebaseUserEmailVerified &&
        firebaseTokenEmailVerified
      ) {
        // The email is fully verified, and this change has synced to the token too.
        notify.success(get(_)('auth.verification.success'), 8000);
        console.log('Email verification full sync success - syncing auth state to user');
        isVerifying = false;
        await updateUserIfPossible();
        if (isActiveContains(get(page), routes.AUTH_ACTION)) {
          // If we're not on a useful page, redirect to /account
          routeTo = routes.ACCOUNT;
        }
      } else {
        // In any other case, sync the most recent firebaseUser data into app state
        console.log('Syncing Firebase user state to local state');
        await updateUserIfPossible();
      }
      if (latestAuthUserState) {
        // Subscribe to dependent observers, if they are missing.
        // This will eventually lead to an asynchronous full user login.
        // NOTE: these do not synchronously update when registered, like Svelte stores.
        // This is why we use the isUserLoading store.
        if (!unsubscribeFromUserPrivate) {
          unsubscribeFromUserPrivate = createUserPrivateObserver(latestAuthUserState.uid);
        }
        if (!unsubscribeFromUserPublic) {
          unsubscribeFromUserPublic = createUserPublicObserver(latestAuthUserState.uid);
        }
        if (!unsubscribeFromCampsite) {
          unsubscribeFromCampsite = createCampsiteObserver(latestAuthUserState.uid);
        }
      }
      if (justLoggedIn && getCurrentRoute()?.route === routes.SIGN_IN) {
        // might happen if you have the sign in page open on two different tabs
        routeTo = routes.MAP;
      }
    } else {
      console.log('Received a null Firebase user update');
      // If the user somehow got logged out by Firebase, sync this change to the app.
      // (e.g. their password was reset elsewhere)
      if (oldStoredUser) {
        console.log('User is/has been logged out');
        // Perform cleanup
        unsubscribeFromInnerObserversIfExisting();
        resetDocCaches();
        user.set(null);
        // Send the user back to the sign in page, if they are not yet on a page where they can stay.
        // NOTE: This is also handled by individual pages. Should it? Probably yes, because
        // individual pages don't only trigger on logout and can include specific messages
        if (getCurrentRoute()?.requiresAuth) {
          notify.info(get(_)('auth.logged-out'), 8000);
          routeTo = routes.SIGN_IN;
        }
      }
      // If we know we are logged out, we are not loading anymore.
      isUserLoading.set(false);
    }

    // Firebase auth has been initialized, regardless of status
    isInitializingFirebase.set(false);

    if (routeTo) {
      // Before navigating, ensure the user is fully loaded.
      await resolveOnUserLoaded();
      return goto(routeTo);
    }
  });

  // Auth unsubscriber
  // Unsubscribes from all related observers
  // Does not clear the local state.
  return () => {
    unsubscribeFromInnerObserversIfExisting();
    unsubscribeFromAuthObserver();
  };
};

const resetDocCaches = () => {
  latestUserPrivateState = null;
  latestUserPublicState = null;
  latestCampsiteState = null;
};

export const checkAndHandleUnverified = async (message?: string, timeout = 8000) => {
  if (!get(user)?.emailVerified) {
    // Migitates https://github.com/WelcometoMyGarden/welcometomygarden/issues/297
    await auth().currentUser?.reload();
    // Note: we check the currentUser.emailVerified prop here, because that is the only
    // one that is atomically set after the .reload()
    // It's enough signal to not show the warning, but for functionality,
    // $user.emailVerified should still be checked before rendering content
    // or taking actions that require full token verification.
    if (!auth().currentUser?.emailVerified) {
      notify.warning(message ?? get(_)('auth.verification.unverified'), timeout);
      return goto(routes.ACCOUNT);
    }
  }
};

export const isEmailVerifiedAndTokenSynced = async () => {
  const currentUser = auth().currentUser;
  const firebaseUserEmailVerified: boolean = currentUser?.emailVerified ?? false;
  const firebaseTokenEmailVerified: boolean = currentUser
    ? (await currentUser.getIdTokenResult()).claims.email_verified ?? false
    : false;

  return firebaseUserEmailVerified && firebaseTokenEmailVerified;
};

/**
 * Only updates the local User store if both its auth record, as well as users and users-private docs are available.
 * @returns the resulting state of the updated user (null if an update was not possible)
 */
const updateUserIfPossible = async () => {
  // These three states required to broadcast a non-null User state locally
  if (latestUserPrivateState && latestUserPublicState && latestAuthUserState) {
    const { email, uid } = latestAuthUserState;
    // Only consider the local user verified if the verification is fully synced.
    // Async because token check is an async operation.
    const emailVerified = await isEmailVerifiedAndTokenSynced();

    const updateProperties = {
      ...latestUserPublicState,
      ...latestUserPrivateState,
      // It's possible that latestCampsiteState is set to null after a garden deletion
      garden: latestCampsiteState,
      email: email || undefined,
      emailVerified,
      // overlap with id on Garden...
      id: uid
    };

    const currentUser = get(user);
    let newUser: User;
    if (!currentUser) {
      newUser = new User(updateProperties);
    } else {
      newUser = currentUser.copyWith(updateProperties);
    }

    user.set(newUser);

    // User initialization is done
    if (get(isUserLoading)) {
      console.log(`User fully loaded: ${newUser.uid}`);
      isUserLoading.set(false);
    }

    return newUser;
  }
  return null;
};

export const createUserPublicObserver = (currentUserId: string) => {
  const docRef = doc(db(), USERS, currentUserId) as DocumentReference<UserPublic>;
  return onSnapshot<UserPublic>(docRef, (doc: DocumentSnapshot<UserPublic>) => {
    const newUserData = doc.data();
    if (newUserData) {
      latestUserPublicState = newUserData;
      updateUserIfPossible();
    }
  });
};

export const createUserPrivateObserver = (currentUserId: string) => {
  const docRef = doc(db(), USERS_PRIVATE, currentUserId) as DocumentReference<UserPrivate>;
  return onSnapshot<UserPrivate>(docRef, (doc: DocumentSnapshot<UserPrivate>) => {
    const newUserPrivateData = doc.data();
    if (newUserPrivateData) {
      latestUserPrivateState = newUserPrivateData;
      updateUserIfPossible();
    }
  });
};

export const createCampsiteObserver = (currentUserId: string) => {
  const docRef = doc(db(), CAMPSITES, currentUserId) as DocumentReference<Garden>;
  return onSnapshot<Garden>(docRef, (doc) => {
    const newCampsiteData = doc.data();
    latestCampsiteState = newCampsiteData ?? null;
    updateUserIfPossible();
  });
};

export const login = async (email: string, password: string): Promise<void> => {
  await signInWithEmailAndPassword(auth(), email, password);
  trackEvent(PlausibleEvent.SIGN_IN);
  return await resolveOnUserLoaded();
};

export const register = async ({
  email,
  password,
  firstName,
  lastName,
  countryCode
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  countryCode: string;
}) => {
  isRegistering.set(true);
  await createUserWithEmailAndPassword(auth(), email, password);
  // TODO Refactor note
  // Now, between these two lines, we are in a state that:
  // 1. triggers an idTokenChanged event (because of the account creation above)
  // 2. has no user and users-private docs yet (partially created account).
  // This is error-prone & confusing.
  // Idea:
  // createUser() creates the user and users-private Firestrore docs in the backend.
  // Is it possible to run createUserWithEmailAndPassword in the backend in createUser too?
  // Then we can atomically say that after createUser() is called, the new user is guaranteed to
  // have a public user and private user doc (remotely).
  //
  await createUser({
    firstName,
    lastName,
    countryCode,
    communicationLanguage: get(locale) ?? 'en'
  });
  trackEvent(PlausibleEvent.CREATE_ACCOUNT);
  await resolveOnUserLoaded();

  isRegistering.set(false);
};

export const logout = async () => {
  await auth().signOut();
  if (auth().currentUser) {
    throw new Error('Log out failed');
  }
  trackEvent(PlausibleEvent.SIGN_OUT);
  // onIdTokenChanged will set the user to null
};

export const applyActionCode = async (code: string) => {
  await firebaseApplyActionCode(auth(), code);
};

export const resendAccountVerification = async () => {
  if (!get(user)) throw 'Please sign in first';
  if (get(user)?.emailVerified) throw 'Your email is already verified. Please refresh the page.';
  return await resendAccVerif();
};

export const verifyPasswordResetCode = (code: string) => {
  return firebaseVerifyPasswordResetCode(auth(), code);
};

export const confirmPasswordReset = (code: string, password: string) => {
  return firebaseConfirmPasswordReset(auth(), code, password);
};

/**
 * Might throw if the login is not recent enough, in that case, reauthenticate
 * https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user
 */
export const deleteAccount = async () => {
  const user = auth().currentUser;
  if (user) {
    await deleteUser(user);
  } else {
    throw new Error('unauthenticated');
  }
};
