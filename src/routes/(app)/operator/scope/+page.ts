/** Default tab — redirect to /profile. */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, '/operator/scope/profile');
};
