import { redirect, error } from '@sveltejs/kit';
import { session } from '$features/auth/stores/session.svelte';
import { hasPermission } from '$features/auth/tier';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	if (!hasPermission(session.principal, 'platform.users.view')) {
		throw redirect(303, '/dashboard');
	}
	if (!params.id) throw error(404, 'Person not found');
	return { personId: params.id };
};
