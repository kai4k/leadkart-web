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

/** Icon is typed as NavItem['icon'] — same shape used everywhere else
 *  in the codebase (lucide-svelte's component type doesn't match
 *  Svelte 5's `Component<...>` cleanly; the structural contract is
 *  enforced by the Icon wrapper). */
type IconComponent = NavItem['icon'];

export interface Crumb {
	label: string;
	href: string;
	icon: IconComponent | null;
}

export interface RouteContext {
	label: string;
	icon: IconComponent | null;
	/** Breadcrumb path — segment-by-segment progression from root to
	 *  current location. Each progressive prefix is matched against
	 *  the nav catalogues; segments without a nav match are title-cased
	 *  fallbacks. Example:
	 *    /settings/users  →  [{Settings, /settings}, {Team, /settings/users}]
	 *    /platform/leads  →  [{Platform, /platform}, {Lead Marketplace, /platform/leads}]
	 */
	crumbs: Crumb[];
}

function titleCase(segment: string): string {
	return segment
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

function matchNav(href: string): NavItem | undefined {
	return ALL_ITEMS.find((item) => item.href === href);
}

export function routeContext(pathname: string): RouteContext {
	const segments = pathname.split('/').filter(Boolean);
	const crumbs: Crumb[] = [];
	let accum = '';
	for (const seg of segments) {
		accum += '/' + seg;
		const nav = matchNav(accum);
		crumbs.push({
			label: nav?.label ?? titleCase(seg),
			href: accum,
			icon: nav?.icon ?? null
		});
	}

	const tail = crumbs[crumbs.length - 1];
	return {
		label: tail?.label ?? 'LeadKart',
		icon: tail?.icon ?? null,
		crumbs
	};
}

/** Legacy export — keep until call sites migrate. */
export function routeTitle(pathname: string): string {
	return routeContext(pathname).label;
}
