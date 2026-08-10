const { db } = require('./firebase');

// Firestore collection names. Mirrors the frontend's `src/lib/api/collections.ts`.
const CAMPSITES = 'campsites';
const CHATS = 'chats';
const STATS = 'stats';
const USERS = 'users';
const USERS_PRIVATE = 'users-private';
const USERS_META = 'users-meta';
const MESSAGES = 'messages';
// Subcollections of users-private/{uid}
const TRAILS = 'trails';
const PUSH_REGISTRATIONS = 'push-registrations';
const UNREADS = 'unreads';

// Typed ref factories.
//
// Each top-level collection needs exactly ONE cast (here), instead of the ~25
// scattered `/** @type {DocumentReference<X>} */ (db.doc(...))` casts that used
// to live at the call sites. The model type is passed as BOTH type params via
// the global `CollectionReference<T>`/`DocumentReference<T>` aliases (`<T, T>`),
// which is what makes `.update()` type-checked. See `types.d.ts`.
//
// Inference facts this relies on (verified against the installed SDK):
// - `.doc()` off a typed collection PRESERVES the type -> doc factories need no
//   cast of their own.
// - `.where()/.orderBy()/.limit()` PRESERVE the type through `Query` -> build
//   queries by chaining off a typed collection factory, never with their own cast.
// - `.collection()` off a typed DocumentReference RESETS to `DocumentData` ->
//   subcollection factories address the subcollection by full path and cast once.

/** @returns {CollectionReference<UserPublic>} */
const usersCol = () => /** @type {CollectionReference<UserPublic>} */ (db.collection(USERS));
/** @param {string} uid */
const usersDoc = (uid) => usersCol().doc(uid);

/** @returns {CollectionReference<UserPrivate>} */
const usersPrivateCol = () =>
  /** @type {CollectionReference<UserPrivate>} */ (db.collection(USERS_PRIVATE));
/** @param {string} uid */
const usersPrivateDoc = (uid) => usersPrivateCol().doc(uid);

/** @returns {CollectionReference<UserMeta>} */
const usersMetaCol = () => /** @type {CollectionReference<UserMeta>} */ (db.collection(USERS_META));
/** @param {string} uid */
const usersMetaDoc = (uid) => usersMetaCol().doc(uid);

/** @returns {CollectionReference<Garden>} */
const campsitesCol = () => /** @type {CollectionReference<Garden>} */ (db.collection(CAMPSITES));
/** @param {string} id */
const campsitesDoc = (id) => campsitesCol().doc(id);

/** @returns {CollectionReference<Chat>} */
const chatsCol = () => /** @type {CollectionReference<Chat>} */ (db.collection(CHATS));
/** @param {string} id */
const chatsDoc = (id) => chatsCol().doc(id);

/** @returns {CollectionReference<StatCount>} */
const statsCol = () => /** @type {CollectionReference<StatCount>} */ (db.collection(STATS));
/** @param {string} id */
const statsDoc = (id) => statsCol().doc(id);

// Subcollections of users-private/{uid} — addressed by full path, cast once each
// (a `.collection()` off a typed doc ref would reset the model type to `DocumentData`).

/** @param {string} chatId @returns {CollectionReference<Message>} */
const messagesCol = (chatId) =>
  /** @type {CollectionReference<Message>} */ (db.collection(`${CHATS}/${chatId}/${MESSAGES}`));
/**
 * @param {string} chatId
 * @param {string} [messageId] omit to get an auto-ID ref for a new message
 */
const messagesDoc = (chatId, messageId) =>
  messageId ? messagesCol(chatId).doc(messageId) : messagesCol(chatId).doc();

/** @param {string} uid @returns {CollectionReference<PushRegistration>} */
const pushRegistrationsCol = (uid) =>
  /** @type {CollectionReference<PushRegistration>} */ (
    db.collection(`${USERS_PRIVATE}/${uid}/${PUSH_REGISTRATIONS}`)
  );

/** @param {string} uid @returns {CollectionReference<Unread>} */
const unreadsCol = (uid) =>
  /** @type {CollectionReference<Unread>} */ (db.collection(`${USERS_PRIVATE}/${uid}/${UNREADS}`));
/** @param {string} uid @param {string} chatId */
const unreadsDoc = (uid, chatId) => unreadsCol(uid).doc(chatId);

/** @param {string} uid @returns {CollectionReference<Trail>} */
const trailsCol = (uid) =>
  /** @type {CollectionReference<Trail>} */ (db.collection(`${USERS_PRIVATE}/${uid}/${TRAILS}`));

module.exports = {
  // names
  CAMPSITES,
  CHATS,
  STATS,
  USERS,
  USERS_PRIVATE,
  USERS_META,
  MESSAGES,
  TRAILS,
  PUSH_REGISTRATIONS,
  UNREADS,
  // factories
  usersCol,
  usersDoc,
  usersPrivateCol,
  usersPrivateDoc,
  usersMetaCol,
  usersMetaDoc,
  campsitesCol,
  campsitesDoc,
  chatsCol,
  chatsDoc,
  statsCol,
  statsDoc,
  messagesCol,
  messagesDoc,
  pushRegistrationsCol,
  unreadsCol,
  unreadsDoc,
  trailsCol
};
