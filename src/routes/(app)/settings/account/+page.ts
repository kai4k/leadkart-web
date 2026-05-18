/**
 * Index redirect for /settings/account — sends visitors to the
 * Profile tab. Mirrors /settings/tenant's redirect pattern.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, '/settings/account/profile');
};
