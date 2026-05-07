/**
 * Auth guard for the (app) route group: signed-out users redirect
 * to /signin with the original path captured in `?next=` so they
 * land back where they tried to go after login.
 */
import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/features/auth/stores/session.svelte';

export function load({ url }) {
	if (!isAuthenticated()) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(307, `/signin?next=${next}`);
	}
	return {};
}
