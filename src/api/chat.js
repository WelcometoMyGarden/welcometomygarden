import { getPublicUserProfile } from './user';
import { creatingNewChat } from '../stores/chat';

export const initiateChat = async (partnerUid) => {
  creatingNewChat.set(true);
  const partner = await getPublicUserProfile(partnerUid);
  creatingNewChat.set(false);
  return partner;
};
