import { USERS, CHATS } from './collections';
import { get } from 'svelte/store';
import { db } from './firebase';
import { getPublicUserProfile } from './user';
import { getUser, user } from '$lib/stores/auth';
import { creatingNewChat, addChat, addMessage, hasInitialized } from '$lib/stores/chat';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDocFromCache, getDocFromServer, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';

export const initiateChat = async (partnerUid: string) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};

export const createChatObserver = async () => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const q = query(collection(db, CHATS), where('users', 'array-contains', currentUser.id));

  return onSnapshot(q, async (querySnapshot) => {
    const changes = querySnapshot.docChanges();
    const amount = querySnapshot.size;
    let counter = 0;
    await Promise.all(
      changes.map(async (change) => {
        const chat = change.doc.data();
        const partnerId = chat.users.find((id: string) => getUser().id !== id);
        const partner = await getPublicUserProfile(partnerId);
        chat.partner = partner;
        addChat({ id: change.doc.id, ...chat });
        counter++;
      })
    );
    if (counter === amount) hasInitialized.set(true);
  },
    (err) => {
      hasInitialized.set(true);
      throw new Error(err);
    });
};

export const observeMessagesForChat = (chatId: string) => {
  const chatRef = doc(db, CHATS, chatId);
  const chatMessagesCollection = collection(chatRef, 'messages');

  return onSnapshot(chatMessagesCollection,
    (snapshot) => {
      const changes = snapshot.docChanges();
      changes.forEach((message) => {
        addMessage(chatId, { id: message.doc.id, ...message.doc.data() });
      });
    },
    (err) => {
      throw new Error(err);
    });
};

export const sendMessage = async (chatId: string, message: string) => {
  const chatRef = doc(db, CHATS, chatId);
  const chatMessagesCollection = collection(chatRef, 'messages');

  await addDoc(chatMessagesCollection, {
    content: message.trim(),
    createdAt: Timestamp.now(),
    from: getUser().id
  });

  await updateDoc(chatRef, {
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });
};

export const create = async (uid1: string, uid2: string, message: string) => {
  const doc = await db.collection('chats').add({
    users: [uid1, uid2],
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });
  await doc.collection('messages').add({
    content: message,
    createdAt: Timestamp.now(),
    from: uid1
  });
  return doc.id;
};
