<script lang="ts">
  import { page } from '$app/stores';
  import { fetchNewChatPartner } from '$lib/api/chat';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { chats, getChatForUser } from '$lib/stores/chat';
  import authAndContinue from '$lib/util/auth-and-continue';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { getConvoRoute, newConversation } from './shared';
  import { goto } from '$app/navigation';
  import notification from '$lib/stores/notification';

  const startChattingWith = async (partnerId: string) => {
    if ($chats) {
      const activeChatWithUser = getChatForUser(partnerId);
      // Existing chat exists
      if (activeChatWithUser) {
        return goto(
          getConvoRoute($chats[activeChatWithUser].partner.firstName, activeChatWithUser)
        );
      }

      // No existing chat exists, mark this chat as a new one.
      try {
        const newPartner = await fetchNewChatPartner(partnerId);
        // TODO move this into layout
        newConversation.set({ name: newPartner.firstName, partnerId });
        goto(getConvoRoute(newPartner.firstName, `new?id=${partnerId}`));
      } catch (ex) {
        // TODO: translate error
        notification.danger("Couldn't find chat partner", 5000);
        console.error(ex);
        goto(routes.CHAT);
      }
    }
  };

  onMount(async () => {
    const queryParams = $page.url.searchParams.toString();
    if (!$user) {
      await authAndContinue({
        continueUrl: `${routes.CHAT}${queryParams ? `?${queryParams}` : ''}`
      });
    }

    // Determine whether a specific chat should be opened
    let withQueryParam = $page.url.searchParams.get('with');
    if (withQueryParam) {
      startChattingWith(withQueryParam);
    }
  });
</script>

<!-- @component Chat overview page. Mostly rendered by its parent layout. -->

<svelte:head>
  <title>{$_('chat.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>
