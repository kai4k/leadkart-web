/**
 * Landing redirect: signed-in → /dashboard, signed-out → /signin.
 * SPA-only — runs on the client because adapter-static + ssr:false.
 */
import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/features/auth/stores/session.svelte';

export function load() {
	throw redirect(307, isAuthenticated() ? '/dashboard' : '/signin');
}
