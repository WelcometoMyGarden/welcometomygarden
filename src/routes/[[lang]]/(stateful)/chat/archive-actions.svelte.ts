import { get } from 'svelte/store';
import { isChatArchivedByUser } from '$lib/stores/chat';
import { archiveChat, unarchiveChat, markChatSeen } from '$lib/api/chat';
import { user } from '$lib/stores/auth';
import { goto } from '$lib/util/navigate';
import routes from '$lib/routes';
import { lr } from '$lib/util/translation-helpers';
import type { LocalChat } from '$lib/types/Chat';
import { rootModal } from '$lib/stores/app';
import { bind } from 'svelte-simple-modal';
import { ConfirmArchiveModal } from '$lib/components/Chat';

export const isConversationSeen = (conversation: LocalChat): boolean =>
  conversation.lastMessageSender === get(user)?.id || conversation.lastMessageSeen !== false;

/**
 * Archive or unarchive a chat. Navigates to the appropriate view afterwards.
 * If the chat has unseen messages, opens the shared confirm dialog instead.
 */
export const toggleArchiveForChat = async (chat: LocalChat): Promise<void> => {
  const currentUser = get(user);
  const isArchived = currentUser ? isChatArchivedByUser(chat, currentUser.id) : false;
  if (isArchived) {
    await unarchiveChat(chat.id, chat.partner.firstName);
    goto(get(lr)(routes.CHAT_ARCHIVE));
    return;
  }
  if (!isConversationSeen(chat)) {
    rootModal.set(bind(ConfirmArchiveModal, { chat }));
    return;
  }
  await archiveChat(chat.id, chat.partner.firstName);
  goto(get(lr)(routes.CHAT));
};
