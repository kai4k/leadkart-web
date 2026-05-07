/**
 * Auth guard for the (app) route group: signed-out users redirect
 * to /signin with the original path captured in `?next=` so they
 * land back where they tried to go after login.
 */
import { redirect } from '@sveltejs/kit';
import { session } from '$lib/features/auth/stores/session.svelte';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = ({ url }) => {
	if (!session.isAuthenticated) {
		const next = encodeURIComponent(url.pathname + url.search);
		throw redirect(307, `/signin?next=${next}`);
	}
	return {};
};
