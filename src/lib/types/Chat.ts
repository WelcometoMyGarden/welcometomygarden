import type { Timestamp } from 'firebase/firestore';
import type { UserPublic } from '../models/User';

/**
 * The chat Firebase document type, modified with partner for the local store
 */
export type FirebaseChat = {
  createdAt: Timestamp;
  lastActivity: Timestamp;
  lastMessage: string;
  /**
   * Array of participating uids
   */
  users: string[];
};

export type LocalChat = FirebaseChat & {
  /**
   * The Firebase chat document ID
   */
  id: string;
  /**
   * The UserPublic document of the
   * Not stored in Firebase, but fetched client-side.
   */
  partner: UserPublic;
};

/**
 * The chat/messages Firebase subcollection document type
 */
export type FirebaseMessage = {
  createdAt: Timestamp;
  content: string;
  /**
   * The uid of the sender
   */
  from: string;
};

export type LocalMessage = FirebaseMessage & {
  /**
   * The Firebase message ID.
   */
  id: string;
};
