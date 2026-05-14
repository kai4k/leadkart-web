/**
 * routeContext — derives the page title + lucide icon for a pathname
 * by matching against the nav catalogues. Used by the Topbar to
 * render the current-page badge (icon + title).
 *
 * Picks the longest matching prefix from all three tier catalogues
 * so /settings/users beats /settings, /platform/leads beats /platform.
 * Falls back to a title-cased final path segment + null icon for
 * routes not in any nav (e.g. /signin, /404).
 *
 * Single page title for now — multi-segment breadcrumb is deferred
 * (Linear / Vercel both ship single titles on dashboard surfaces; the
 * sidebar already shows the user's location in the nav tree).
 */

import { PLATFORM_NAV, TENANT_ADMIN_NAV, TENANT_USER_NAV, type NavItem } from '$lib/config/nav';

const ALL_ITEMS = [...PLATFORM_NAV, ...TENANT_ADMIN_NAV, ...TENANT_USER_NAV].flatMap(
	(s) => s.items
);

export interface RouteContext {
	label: string;
	/** Icon is typed as NavItem['icon'] — same shape used everywhere
	 *  else in the codebase (lucide-svelte's component type doesn't
	 *  match Svelte 5's `Component<...>` cleanly; the structural
	 *  contract is enforced by the Icon wrapper). */
	icon: NavItem['icon'] | null;
}

export function routeContext(pathname: string): RouteContext {
	const match = ALL_ITEMS.filter(
		(item) => pathname === item.href || pathname.startsWith(item.href + '/')
	).sort((a, b) => b.href.length - a.href.length)[0];

	if (match) {
		return { label: match.label, icon: match.icon };
	}

	const tail = pathname.split('/').filter(Boolean).pop();
	const label = tail
		? tail
				.split('-')
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ')
		: 'LeadKart';
	return { label, icon: null };
}

/** Legacy export — keep until call sites migrate. */
export function routeTitle(pathname: string): string {
	return routeContext(pathname).label;
}
