/**
 * Index redirect for /settings/tenant — sends visitors to the first
 * tab (Profile). Settings sections are sub-routes per WAI-ARIA
 * Authoring Practices "tabs linked to URLs use <nav>, not the tabs
 * design pattern" + Stripe / Linear / GitHub / Vercel canon.
 *
 * Deep-links to /settings/tenant/{profile,statutory,contact,
 * preferences} are stable and shareable; landing on the bare
 * /settings/tenant URL nudges users to the canonical first tab.
 */
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	throw redirect(307, '/settings/tenant/profile');
};
