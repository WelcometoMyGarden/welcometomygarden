import { CHATS, MESSAGES } from './collections';
import { db } from './firebase';
import { getPublicUserProfile } from './user';
import { creatingNewChat, addChat, addMessage, hasInitialized, removeChat } from '$lib/stores/chat';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
  CollectionReference
} from 'firebase/firestore';
import type { FirebaseChat, FirebaseMessage } from '$lib/types/Chat';

export const initiateChat = async (partnerUid: string) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};

export const createChatObserver = async (currentUserId: string) => {
  const q = query(
    collection(db(), CHATS) as CollectionReference<FirebaseChat>,
    where('users', 'array-contains', currentUserId)
  );

  return onSnapshot(
    q,
    async (querySnapshot) => {
      const changes = querySnapshot.docChanges();
      await Promise.all(
        changes.map(async (change) => {
          const chat = change.doc.data();
          if (change.type === 'added' || change.type === 'modified') {
            // Add partner info to the chat and store in the local chat model
            const partnerId = chat.users.find((id: string) => currentUserId !== id);
            if (!partnerId) {
              console.error(`Couldn't find the chat partner for chat ${change.doc.id}`);
              // Don't throw an error, to avoid breaking the other chat loads
              return null;
            }
            const partner = await getPublicUserProfile(partnerId);
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
      hasInitialized.set(true);
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

export const sendMessage = async (currentUserId: string, chatId: string, message: string) => {
  const chatRef = doc(db(), CHATS, chatId);
  const chatMessagesCollection = collection(chatRef, MESSAGES);

  await addDoc(chatMessagesCollection, {
    content: message.trim(),
    createdAt: Timestamp.now(),
    from: currentUserId
  });

  await updateDoc(chatRef, {
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });
};

export const createChat = async (uid1: string, uid2: string, message: string) => {
  const chatCollection = collection(db(), CHATS) as CollectionReference<FirebaseChat>;

  const docRef = await addDoc(chatCollection, {
    users: [uid1, uid2],
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });

  const chatMessagesCollection = collection(
    docRef,
    MESSAGES
  ) as CollectionReference<FirebaseMessage>;

  await addDoc(chatMessagesCollection, {
    content: message,
    createdAt: Timestamp.now(),
    from: uid1
  });

  return docRef.id;
};
