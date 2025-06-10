import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = function load() {
  redirect(301, '/about-membership');
};
