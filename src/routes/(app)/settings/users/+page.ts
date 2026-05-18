import { redirect } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (!hasPermission(session.principal, 'identity.users.view')) {
		throw redirect(303, '/dashboard');
	}
};
