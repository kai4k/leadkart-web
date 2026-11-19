/**
 * routeContext — derives the page title + lucide icon for a pathname
 * by matching against the nav catalogues. Used by the Topbar to
 * render the current-page badge (icon + title).
 *
 * Reads the one nav config (`config/nav.ts`) — every entry, whoever may
 * see it — and matches each progressive path prefix exactly, so
 * /settings/users resolves to "Team" and /settings to a title-cased
 * segment. Falls back to a title-cased final path segment + null icon for
 * routes not in any nav (e.g. /signin, /404).
 *
 * Single page title for now — multi-segment breadcrumb is deferred
 * (Linear / Vercel both ship single titles on dashboard surfaces; the
 * sidebar already shows the user's location in the nav tree).
 */

import type { ResolvedPathname } from '$app/types';
import { NAV_ROUTES, type NavRoute, type NavRouteKey } from '#lib/config/nav.ts';
import { NAV_ICONS } from '#lib/config/nav-icons.ts';
import type { LucideIcon } from '#lib/icons/index.ts';

interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
}

const ALL_ITEMS: NavItem[] = (Object.entries(NAV_ROUTES) as Array<[NavRouteKey, NavRoute]>).map(
	([key, r]) => ({ href: r.href, label: r.label, icon: NAV_ICONS[key] })
);

type IconComponent = LucideIcon;

interface Crumb {
	label: string;
	href: ResolvedPathname;
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
		accum += `/${seg}`;
		const nav = matchNav(accum);
		crumbs.push({
			label: nav?.label ?? titleCase(seg),
			href: accum as ResolvedPathname,
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
