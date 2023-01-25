import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import {
  applyActionCode as firebaseApplyActionCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type Unsubscribe,
  confirmPasswordReset as firebaseConfirmPasswordReset
} from 'firebase/auth';
import { auth, db } from './firebase';
import { isLoggingIn, isRegistering, user, isInitializing, getUser } from '$lib/stores/auth';
import User, { type UserPrivate, type UserPublic } from '$lib/models/User';
import { createUser, resendAccountVerification as resendAccVerif } from '@/lib/api/functions';
import { getAllUserInfo } from './user';
import { USERS, USERS_PRIVATE } from './collections';
import { doc, DocumentReference, DocumentSnapshot, onSnapshot } from 'firebase/firestore';
import notify from '$lib/stores/notification';
import { goto } from '$app/navigation';
import routes from '../routes';
import { page } from '$app/stores';
import { isActiveContains } from '../util/isActive';

/**
 * Creates Firebase observers that manage the app's User model.
 */
export const createAuthObserver = (): Unsubscribe => {
  let unsubscribeFromUserPrivate: (() => void) | null = null;
  let unsubscribeFromUserPublic: (() => void) | null = null;

  const unsubscribeFromInnerObservers = () => {
    if (unsubscribeFromUserPrivate) unsubscribeFromUserPrivate();
    if (unsubscribeFromUserPublic) unsubscribeFromUserPublic();
  };

  let isVerifying = false;

  // We use this listener instead of onAuthStateChanged because we want access to token refresh events.
  // This is useful to fully synchronize the emailVerified state across tabs, without requiring
  // re-login. See code below.
  // https://firebase.google.com/docs/reference/node/firebase.auth.Auth#onidtokenchanged
  const unsubscribeFromAuthObserver = auth().onIdTokenChanged(async (firebaseUser) => {
    console.info('auth/token changed');
    // Reset subscriptions
    unsubscribeFromInnerObservers();

    const oldStoredUser = get(user);
    if (oldStoredUser == null) {
      console.info('Previous user was null');
    }
    let newStoredUser: User | null = null;
    let routeTo: string | null = null;

    if (firebaseUser) {
      // If already logged in
      const firebaseUserEmailVerified: boolean = firebaseUser.emailVerified;
      // This is undocumented, but it gets set, and it is used to check whether the email was verified in
      // Firestore (the token gets passed to the Firestore in the backend)
      console.info('User email verified: ', firebaseUserEmailVerified);
      const firebaseTokenEmailVerified: boolean =
        (await firebaseUser.getIdTokenResult()).claims.email_verified ?? false;
      console.info('Token email verified: ', firebaseTokenEmailVerified);

      // emailVerified signals that we have to consider this.
      if (
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
        //

        console.log('Email verified: force refresh token for full sync');
        isVerifying = true;
        // To set firebaseTokenEmailVerified to true, we force-refresh the token.
        // This should re-trigger onIdTokenChanged with true & true
        // **This will also trigger onIdTokenChanged in other open tabs.**
        await firebaseUser.getIdToken(true);
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
        console.log('Email verification full sync success - storing new user');
        isVerifying = false;
        newStoredUser = await storeNewUser();
        if (!isActiveContains(get(page), routes.ACCOUNT)) {
          // - demo-test auth will already be on /account
          // - staging/production auth will be on auth/action,
          //   if it has not already been redirected by the continueUrl redirector.
          routeTo = routes.ACCOUNT;
        }
      } else {
        // In any other case, use the most recent firebaseUser data to
        // store a User
        console.log('Storing new user');
        newStoredUser = await storeNewUser();
      }
      if (newStoredUser) {
        // Re-subscribe to dependent observers
        unsubscribeFromUserPrivate = await createUserPrivateObserver(newStoredUser.id);
        unsubscribeFromUserPublic = await createUserPublicObserver(newStoredUser.id);
      }
    } else {
      console.log('Received a null Firebase user update');
      // If the user somehow got logged out by Firebase, sync this change to the app.
      // (e.g. their password was reset elsewhere)
      if (oldStoredUser) {
        console.log('User is/has been logged out');
        user.set(null);
        // Send the user back to the sign in page, if they are not yet on a page where they can stay.
        if (
          !(isActiveContains(get(page), routes.SIGN_IN) || isActiveContains(get(page), routes.HOME))
        ) {
          notify.info(get(_)('auth.logged-out'), 8000);
          routeTo = routes.SIGN_IN;
        }
      }
    }

    isInitializing.set(false);
    if (routeTo) {
      return goto(routeTo);
    }
  });

  // Unsubscribe from all related observers
  return () => {
    unsubscribeFromInnerObservers();
    unsubscribeFromAuthObserver();
  };
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
 * Fetches user data from the Firestore, combines it with the given Firebase User,
 * then stores it in the local User model.
 * @returns {Promise<User>} a User object with the new data
 */
export const storeNewUser = async () => {
  const firebaseUser = auth().currentUser;
  if (firebaseUser == null) {
    console.warn(
      'storeNewUser called when currentUser was null. Setting the local User store to null.'
    );
    if (get(user) != null) {
      user.set(null);
    }
    return null;
  }

  // TODO: refactor, see above. This fetches the users-private and user-public docs.
  // We should be able to fully depend on the streaming listeners for both docs that
  // were added, this generates unnecessary fetches.
  // Approach to fix this:
  // 1. cache the last userPrivate and userPublic docs received from the stream
  // 2. if both exist, store a new user with the last docs
  // This ensures that a local User model is either fully complete, or `null`
  const userInfo = await getAllUserInfo(firebaseUser.uid);
  const { email, uid } = firebaseUser;
  // Only consider the local user verified if the verification is fully synced.
  const emailVerified = await isEmailVerifiedAndTokenSynced();
  const newUser = new User({
    ...userInfo,
    email: email || undefined,
    emailVerified,
    id: uid
  });
  user.set(newUser);
  return newUser;
};

export const createUserPublicObserver = async (currentUserId: string) => {
  const docRef = doc(db(), USERS, currentUserId) as DocumentReference<UserPublic>;
  return onSnapshot<UserPublic>(docRef, (doc: DocumentSnapshot<UserPublic>) => {
    const newUserData = doc.data();
    if (newUserData) {
      const newUser = getUser().copyWith(newUserData);
      user.set(newUser);
    }
  });
};

export const createUserPrivateObserver = async (currentUserId: string) => {
  const docRef = doc(db(), USERS_PRIVATE, currentUserId) as DocumentReference<UserPrivate>;
  return onSnapshot<UserPrivate>(docRef, (doc: DocumentSnapshot<UserPrivate>) => {
    const newUserPrivateData = doc.data();
    if (newUserPrivateData) {
      const newUser = getUser().copyWith(newUserPrivateData);
      user.set(newUser);
    }
  });
};

export const login = async (email: string, password: string): Promise<void> => {
  isLoggingIn.set(true);
  await signInWithEmailAndPassword(auth(), email, password);
  // TODO refactor: see below in register
  await storeNewUser();
  isLoggingIn.set(false);
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
  // TODO: refactor
  // - Problem: createUserWithEmailAndPassword triggers the onAuthStateChanged listener, with limited user data
  //    and the firebase docs are not yet created, so we expect the error "'This person does not have an account.'"
  //    and reload the user data after the user is created
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
  await createUser({ firstName, lastName, countryCode });
  await storeNewUser();
  isRegistering.set(false);
};

export const logout = async () => {
  await auth().signOut();
  if (auth().currentUser) {
    throw new Error('Log out failed');
  }
  user.set(null);
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
