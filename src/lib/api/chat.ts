import { USERS, CHATS } from './collections';
import { get } from 'svelte/store';
import { db } from './firebase';
import { getPublicUserProfile } from './user';
import { getUser, user } from '$lib/stores/auth';
import { creatingNewChat, addChat, addMessage, hasInitialized } from '$lib/stores/chat';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, getDocFromCache, getDocFromServer, onSnapshot } from 'firebase/firestore';

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

  // https://firebase.google.com/docs/firestore/manage-data/add-data#add_a_document
  // Behind the scenes, .add(...) and .doc().set(...) are completely equivalent, so you can use whichever is more convenient.
  setDoc(chatMessagesCollection, )

  await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .add({
      content: message.trim(),
      createdAt: Timestamp.now(),
      from: get(user).id
    });
  await db.collection('chats').doc(chatId).update({
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });
};

export const create = async (uid1, uid2, message) => {
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
