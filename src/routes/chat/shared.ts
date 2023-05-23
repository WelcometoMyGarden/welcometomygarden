import routes from '$lib/routes';
import createSlug from '$lib/util/createSlug';
import { writable } from 'svelte/store';

/**
 * Create a route for a specific chat with the slugified name or the chat partner (for aesthetic purposes),
 * and their UID (for an actual lookup)
 * @param partnerName
 * @param chatId
 */
export const getConvoRoute = (partnerName: string, chatId: string) =>
  `${routes.CHAT}/${createSlug(partnerName)}/${chatId}`;

export const newConversation = writable<{ name: string; partnerId: string } | null>(null);
