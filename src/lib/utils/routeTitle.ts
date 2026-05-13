/**
 * routeTitle — derives a single human-readable page title from a
 * pathname by matching against the nav catalogues. Used by the
 * Topbar's breadcrumb slot.
 *
 * Picks the longest matching prefix from all three tier catalogues
 * so /settings/users beats /settings, /platform/leads beats /platform,
 * etc. Falls back to a title-cased final path segment for routes not
 * in any nav (e.g. /signin, /404).
 *
 * Single page title for now — multi-segment breadcrumb is deferred
 * (Linear / Vercel both ship single titles on dashboard surfaces; the
 * sidebar already shows the user's location in the nav tree).
 */

import { PLATFORM_NAV, TENANT_ADMIN_NAV, TENANT_USER_NAV } from '$lib/config/nav';

const ALL_ITEMS = [...PLATFORM_NAV, ...TENANT_ADMIN_NAV, ...TENANT_USER_NAV].flatMap(
	(s) => s.items
);

export function routeTitle(pathname: string): string {
	const match = ALL_ITEMS.filter(
		(item) => pathname === item.href || pathname.startsWith(item.href + '/')
	).sort((a, b) => b.href.length - a.href.length)[0];

	if (match) return match.label;

	const tail = pathname.split('/').filter(Boolean).pop();
	if (!tail) return 'LeadKart';
	return tail
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}
