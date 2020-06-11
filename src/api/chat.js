import { get } from 'svelte/store';
import { db } from './index';
import { getPublicUserProfile } from './user';
import { user } from '../stores/auth';
import { creatingNewChat, addChat, addMessage } from '../stores/chat';

export const initiateChat = async (partnerUid) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};

export const createChatsListener = async () => {
  const query = await db.collection('chats').where('users', 'array-contains', get(user).id);
  return query.onSnapshot(
    (querySnapshot) => {
      const changes = querySnapshot.docChanges();
      changes.forEach((change) => {
        addChat({ id: change.doc.id, ...change.doc.data() });
      });
    },
    (err) => {
      throw new Error(err);
    }
  );
};

export const createMessageListener = (chatId) => {
  db.collection('chats')
    .doc(chatId)
    .collection('messages')
    .onSnapshot(
      (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((message) => {
          addMessage(chatId, message);
        });
      },
      (err) => {
        throw new Error(err);
      }
    );
};

export const sendMessage = async (chatId, message) => {
  await db.collection('chats').doc(chatId).update({
    lastActivity: db.FieldValue.serverTimestamp(),
    lastMessage: message
  });
  return db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .add({
      message,
      createdAt: db.FieldValue.serverTimestamp(),
      from: get(user).id
    });
};

export const create = async (uid1, uid2, message) => {
  const doc = await db.collection('chats').add({
    users: [uid1, uid2],
    createdAt: db.FieldValue.serverTimestamp(),
    lastActivity: db.FieldValue.serverTimestamp(),
    lastMessage: message
  });
  return doc.collection('messages').add({
    message,
    createdAt: db.FieldValue.serverTimestamp(),
    from: uid1
  });
};
