/**
 * Index redirect for /settings/account — sends visitors to the only
 * sub-route today (Security). When Sessions / Personal Profile /
 * Notifications land as siblings, /security stays the canonical
 * default unless we surface a per-user "last visited tab" preference.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, '/settings/account/security');
};
