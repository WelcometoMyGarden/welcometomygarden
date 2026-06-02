import { get } from 'svelte/store';
import { isChatArchivedByUser } from '$lib/stores/chat';
import { archiveChat, unarchiveChat } from '$lib/api/chat';
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
    await goto(get(lr)(routes.CHAT_ARCHIVE));
    await unarchiveChat(chat.id, chat.partner.firstName);
    return;
  }
  // Else, the archival case
  if (!isConversationSeen(chat)) {
    rootModal.set(bind(ConfirmArchiveModal, { chat }));
    return;
  }
  // Note: I'm not exactly sure why, but if we first archive the chat and then do the goto() call here
  // then a weird bug appears sometimes when you archive the currently selected chat.
  // It's probably related to the mechanish where the current URL determines the currently selected chat
  // through side-effects ($derived). If we first archive the chat, it causes $visibleChats to chagne, but
  // the page URL won't have changed yet -> on render SvelteKit may try to mark a ConversationCard as selected
  // (set the property) while it is being removed from the DOM. Unselecting first prevents this.
  //
  // First unselect the chat
  await goto(get(lr)(routes.CHAT));
  // Next, archive it
  await archiveChat(chat.id, chat.partner.firstName);
};
