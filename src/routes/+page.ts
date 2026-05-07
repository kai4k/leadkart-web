/**
 * Landing redirect: signed-in → /dashboard, signed-out → /signin.
 * SPA-only — runs on the client because adapter-static + ssr:false.
 */
import { redirect } from '@sveltejs/kit';
import { session } from '$lib/features/auth/stores/session.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, session.isAuthenticated ? '/dashboard' : '/signin');
};
