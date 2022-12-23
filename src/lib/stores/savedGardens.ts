import { derived } from 'svelte/store';
import { user } from './auth';

export const savedGardens = derived(user, ($user) => $user?.savedGardens ?? []);
