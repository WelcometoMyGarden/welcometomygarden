import { CHATS, MESSAGES } from './collections';
import { db } from './firebase';
import { getPublicUserProfile } from './user';
import {
  creatingNewChat,
  addChat,
  addMessage,
  hasInitialized,
  removeChat,
  chatsCountWithUnseenMessages
} from '$lib/stores/chat';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
  type CollectionReference,
  type DocumentReference
} from 'firebase/firestore';
import type { FirebaseChat, FirebaseMessage } from '$lib/types/Chat';
import { getUser } from '$lib/stores/auth';
import type { UserPublic } from '$lib/models/User';
import routes from '$lib/routes';
import { get } from 'svelte/store';
import { goto } from '$lib/util/navigate';
import { handledOpenFromIOSPWA } from '$lib/stores/app';
import { isOnIDevicePWA } from '$lib/util/push-registrations';

/**
 * Fetches the chat partner's profile, setting the new chat loader.
 * @param partnerUid
 * @returns the partner's user pfolie
 */
export const initiateChat = async (partnerUid: string) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};

export const createChatObserver = () => {
  const q = query(
    collection(db(), CHATS) as CollectionReference<FirebaseChat>,
    where('users', 'array-contains', getUser().id)
  );

  return onSnapshot(
    q,
    async (querySnapshot) => {
      const changes = querySnapshot.docChanges();
      try {
        await Promise.all(
          changes.map(async (change) => {
            const chat = change.doc.data();
            if (change.type === 'added' || change.type === 'modified') {
              // Add partner info to the chat and store in the local chat model
              const partnerId = chat.users.find((id: string) => getUser().id !== id);
              if (!partnerId) {
                console.error(`Couldn't find the chat partner for chat ${change.doc.id}`);
                // Don't throw an error, to avoid breaking the other chat loads
                return null;
              }
              let partner: UserPublic;
              try {
                partner = await getPublicUserProfile(partnerId);
              } catch (e) {
                console.error(
                  `Error while getting the public profile of chat partner with uid "${partnerId}"`,
                  e
                );
                return null;
              }
              const localChat = {
                ...chat,
                partner,
                id: change.doc.id
              };
              addChat(localChat);
            } else if (change.type === 'removed') {
              // Remove chat (not possible yet by users)
              removeChat(change.doc.id);
            }
          })
        );
      } catch (e) {
        console.error('Uncaught error while handling a chat snapshot', e);
      }

      console.log('Chats initialized or updated');
      hasInitialized.set(true);

      // Special check for iOS PWA on startup
      // Note: appHasLoaded doesn't resolve until handledOpenFromIOSPWA is true, in this case.
      if (!get(handledOpenFromIOSPWA) && isOnIDevicePWA()) {
        if (
          // Prevent the UI from jumping automatically to the chat while you're doing something else
          // TODO: maybe there is a better way to open the chat UI when someone just
          // "opened" the iOS home app (and only then)
          // The current user has an unread chat
          get(chatsCountWithUnseenMessages) > 0
        ) {
          // show the chat if a new chat has arrived when
          // opening the app
          console.log('Routing iOS PWA to the chat op open because unread chat');
          goto(routes.CHAT);
          // Ensures that we don't open the chat twice in the same session, but only after the first time
          // chats are loaded.
        } else {
          // Open the map if we opened the app without an unread chat
          console.log('Routing iOS PWA to the map on app open, no unread chats');
          goto(routes.MAP);
        }
      }
      // In any case, complete iOS PWA open handling for this session after the first run
      handledOpenFromIOSPWA.set(true);
    },
    (err) => {
      hasInitialized.set(true);
      console.error(err);
      throw err;
    }
  );
};

export const observeMessagesForChat = (chatId: string) => {
  const chatRef = doc(db(), CHATS, chatId);
  const chatMessagesCollection = collection(
    chatRef,
    MESSAGES
  ) as CollectionReference<FirebaseMessage>;

  return onSnapshot(
    chatMessagesCollection,
    (snapshot) => {
      const changes = snapshot.docChanges();
      changes.forEach((message) => {
        addMessage(chatId, { id: message.doc.id, ...message.doc.data() });
      });
    },
    (err) => {
      console.error(err);
      throw err;
    }
  );
};

export const sendMessage = async (chatId: string, message: string) => {
  const chatRef = doc(db(), CHATS, chatId) as DocumentReference<FirebaseChat>;
  const chatMessagesCollection = collection(chatRef, MESSAGES);

  await addDoc(chatMessagesCollection, {
    content: message.trim(),
    createdAt: Timestamp.now(),
    from: getUser().id
  });

  await updateDoc(chatRef, {
    lastActivity: Timestamp.now(),
    lastMessage: message.trim(),
    lastMessageSeen: false,
    lastMessageSender: getUser().id
  });
};

export const markChatSeen = async (chatId: string) => {
  const chatRef = doc(db(), CHATS, chatId) as DocumentReference<FirebaseChat>;
  await updateDoc(chatRef, {
    lastMessageSeen: true
  });
};

/**
 * Creates a chat in Firebase, and sends the given first message from the current user to the recipient.
 * If the recipient UID is invalid, Firstore rules cause an error.
 */
export const createChat = async (recipientUid: string, message: string) => {
  const chatCollection = collection(db(), CHATS) as CollectionReference<FirebaseChat>;

  const docRef = await addDoc(chatCollection, {
    users: [getUser().id, recipientUid],
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now(),
    lastMessage: message.trim(),
    lastMessageSeen: false,
    lastMessageSender: getUser().id
  });

  const chatMessagesCollection = collection(
    docRef,
    MESSAGES
  ) as CollectionReference<FirebaseMessage>;

  await addDoc(chatMessagesCollection, {
    content: message,
    createdAt: Timestamp.now(),
    from: getUser().id
  });

  return docRef.id;
};
