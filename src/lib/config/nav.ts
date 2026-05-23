/**
 * Sidebar navigation catalogue.
 *
 * Architecture:
 *   1. The catalogue is tier-keyed (PLATFORM / TENANT_ADMIN / TENANT_USER).
 *      Tier is derived synchronously from session.principal — a $derived
 *      projection over page.data.capabilities, which the (app) root
 *      layout server load bakes into first-paint HTML. Sidebar renders
 *      on the first frame, no skeleton.
 *
 *   2. Items render AS-IS — no per-item permission filter. The page each
 *      link goes to enforces fine-grained perms at action time. Stripe,
 *      AWS Console, GitHub, Linear, Vercel all follow this pattern: nav
 *      is a stable shell, not a permission audit.
 *
 *   3. Items here MUST correspond to existing routes. Dead links are
 *      worse than missing entries — they break trust in the nav. Roadmap
 *      destinations (leads, orders, dispatch, etc.) live in roadmap docs
 *      until their routes ship.
 *
 * References:
 *   - Stripe Dashboard: operator vs merchant menus are entirely separate
 *     surfaces. LeadKart conflates them under one app via tier-split nav.
 *   - Linear: per-role nav catalogues.
 *   - Vercel: per-scope (personal vs team) menus.
 */

import {
	LayoutDashboard,
	Users,
	Settings,
	ShieldCheck,
	Building2,
	Inbox,
	type Icon as LucideIcon
} from 'lucide-svelte';
import type { PrincipalTier } from '$lib/features/auth/capabilities';

export interface NavItem {
	href: string;
	label: string;
	icon: typeof LucideIcon;
}

export interface NavSection {
	title?: string;
	items: NavItem[];
}

export const PLATFORM_NAV: NavSection[] = [
	{
		title: 'Operator',
		items: [
			{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
			{ href: '/operator/tenants', label: 'Tenants', icon: Building2 }
		]
	},
	{
		title: 'Account',
		items: [{ href: '/settings/account', label: 'Account', icon: ShieldCheck }]
	}
];

export const TENANT_ADMIN_NAV: NavSection[] = [
	{
		items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
	},
	{
		title: 'Administration',
		items: [
			{ href: '/settings/tenant', label: 'Tenant Settings', icon: Settings },
			{ href: '/settings/users', label: 'Team', icon: Users },
			{ href: '/settings/roles', label: 'Roles', icon: ShieldCheck },
			{ href: '/permission-requests', label: 'Permission requests', icon: Inbox }
		]
	},
	{
		title: 'Account',
		items: [{ href: '/settings/account', label: 'Account', icon: ShieldCheck }]
	}
];

export const TENANT_USER_NAV: NavSection[] = [
	{
		items: [{ href: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard }]
	},
	{
		title: 'My Work',
		items: [{ href: '/permission-requests', label: 'Permission requests', icon: Inbox }]
	},
	{
		title: 'Account',
		items: [{ href: '/settings/account', label: 'Account', icon: ShieldCheck }]
	}
];

/**
 * Returns the nav catalogue appropriate for the principal's tier.
 * Empty array for 'unknown' (signed-out users shouldn't see (app)/*
 * anyway — the layout's auth guard redirects them).
 */
export function navForTier(tier: PrincipalTier): NavSection[] {
	switch (tier) {
		case 'platform-super':
		case 'platform-staff':
			return PLATFORM_NAV;
		case 'tenant-admin':
			return TENANT_ADMIN_NAV;
		case 'tenant-user':
			return TENANT_USER_NAV;
		case 'unknown':
		default:
			return [];
	}
}
