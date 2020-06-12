import { get } from 'svelte/store';
import { db, Timestamp } from './index';
import { getPublicUserProfile } from './user';
import { user } from '../stores/auth';
import { creatingNewChat, addChat, addMessage } from '../stores/chat';

export const initiateChat = async (partnerUid) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};

export const createChatObserver = async () => {
  const query = await db.collection('chats').where('users', 'array-contains', get(user).id);
  return query.onSnapshot(
    (querySnapshot) => {
      const changes = querySnapshot.docChanges();
      changes.forEach(async (change) => {
        const chat = change.doc.data();
        const partnerId = chat.users.find((id) => get(user).id !== id);
        const partner = await getPublicUserProfile(partnerId);
        chat.partner = partner;
        addChat({ id: change.doc.id, ...chat });
      });
    },
    (err) => {
      throw new Error(err);
    }
  );
};

export const observeMessagesForChat = (chatId) => {
  db.collection('chats')
    .doc(chatId)
    .collection('messages')
    .onSnapshot(
      (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((message) => {
          addMessage(chatId, { id: message.doc.id, ...message.doc.data() });
        });
      },
      (err) => {
        throw new Error(err);
      }
    );
};

export const sendMessage = async (chatId, message) => {
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
