/**
 * Sidebar navigation config — three tier-scoped catalogues so the
 * frontend can render the right menu for the signed-in user.
 *
 * Per docs/reference/dotnet-BRD.md §3 + docs/adr/0036-permission-model.md:
 *
 *   PLATFORM_NAV       — LeadKart internal staff (SuperAdmin /
 *                        PlatformManager / LeadAgent). Cross-tenant
 *                        operator UI: marketplace, verification queue,
 *                        tenant management, impersonation.
 *
 *   TENANT_ADMIN_NAV   — CompanyOwner / OfficeAdministrator. Full
 *                        tenant scope: ops menus + administration
 *                        (tenant settings, users, roles).
 *
 *   TENANT_USER_NAV    — SalesExecutive / DispatchExecutive / etc.
 *                        Personal workspace: my leads, my tasks,
 *                        notifications. No admin section.
 *
 * `navForTier(tier)` returns the right catalogue. Sidebar.svelte
 * additionally filters by permission (item.requires) — that's the
 * second gate after the tier picks the catalogue.
 *
 * Industry refs:
 *   - Stripe Dashboard: operator vs merchant menus are entirely
 *     separate surfaces (admin.stripe.com vs dashboard.stripe.com).
 *     LeadKart conflates them under one app because the operator UI
 *     is internal-only; the tier-split nav substitutes for separate
 *     domain hosting.
 *   - Linear: per-role menus.
 *   - Vercel: per-scope (personal vs team vs org) menus.
 */

import {
	LayoutDashboard,
	Users,
	ShoppingCart,
	Boxes,
	Truck,
	ListTodo,
	Bell,
	Settings,
	ShieldCheck,
	Building2,
	UserCheck,
	type Icon as LucideIcon
} from 'lucide-svelte';
import type { PrincipalTier } from '$lib/features/auth/tier';

export interface NavItem {
	href: string;
	label: string;
	icon: typeof LucideIcon;
	/** Permission name required to see this item; null = no gate.
	 *  Sidebar additionally hides items the user lacks the permission
	 *  for (SuperUser short-circuit applies). */
	requires: string | null;
}

export interface NavSection {
	title?: string;
	items: NavItem[];
}

/* ─────────────────────────────────────────────────────────────────
 * PLATFORM tier — LeadKart internal staff
 * ───────────────────────────────────────────────────────────────── */

export const PLATFORM_NAV: NavSection[] = [
	{
		items: [
			{ href: '/dashboard', label: 'Operator Dashboard', icon: LayoutDashboard, requires: null }
		]
	},
	{
		title: 'Marketplace',
		items: [
			{ href: '/platform/leads', label: 'Lead Marketplace', icon: ShoppingCart, requires: null },
			{ href: '/platform/verify', label: 'Verification Queue', icon: UserCheck, requires: null }
		]
	},
	{
		title: 'Operators',
		items: [
			{ href: '/platform/tenants', label: 'Tenants', icon: Building2, requires: null },
			{ href: '/platform/persons', label: 'People', icon: Users, requires: null },
			{
				href: '/platform/impersonation',
				label: 'Impersonation',
				icon: ShieldCheck,
				requires: null
			}
		]
	},
	{
		title: 'Account',
		items: [
			{
				href: '/settings/account',
				label: 'Account',
				icon: ShieldCheck,
				requires: null
			}
		]
	}
];

/* ─────────────────────────────────────────────────────────────────
 * TENANT-ADMIN tier — CompanyOwner / OfficeAdministrator
 * ───────────────────────────────────────────────────────────────── */

export const TENANT_ADMIN_NAV: NavSection[] = [
	{
		items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requires: null }]
	},
	{
		title: 'Operations',
		items: [
			{ href: '/leads', label: 'Leads', icon: Users, requires: 'crm.leads.view' },
			{ href: '/orders', label: 'Orders', icon: ShoppingCart, requires: 'orders.view' },
			{ href: '/inventory', label: 'Inventory', icon: Boxes, requires: 'inventory.view' },
			{ href: '/dispatch', label: 'Dispatch', icon: Truck, requires: 'dispatch.view' }
		]
	},
	{
		title: 'Workspace',
		items: [
			{ href: '/tasks', label: 'Tasks', icon: ListTodo, requires: null },
			{ href: '/notifications', label: 'Notifications', icon: Bell, requires: null }
		]
	},
	{
		title: 'Administration',
		items: [
			{
				href: '/settings/tenant',
				label: 'Tenant Settings',
				icon: Settings,
				requires: 'tenant.admin'
			},
			{ href: '/settings/users', label: 'Team', icon: Users, requires: 'identity.users.view' },
			{
				href: '/settings/roles',
				label: 'Roles',
				icon: ShieldCheck,
				requires: 'identity.roles.view'
			}
		]
	},
	{
		title: 'Account',
		items: [
			{
				href: '/settings/account',
				label: 'Account',
				icon: ShieldCheck,
				requires: null
			}
		]
	}
];

/* ─────────────────────────────────────────────────────────────────
 * TENANT-USER tier — SalesExecutive / DispatchExecutive / etc.
 * ───────────────────────────────────────────────────────────────── */

export const TENANT_USER_NAV: NavSection[] = [
	{
		items: [{ href: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard, requires: null }]
	},
	{
		title: 'My Work',
		items: [
			{ href: '/leads', label: 'My Leads', icon: Users, requires: 'crm.leads.view' },
			{ href: '/tasks', label: 'My Tasks', icon: ListTodo, requires: null },
			{ href: '/notifications', label: 'Notifications', icon: Bell, requires: null }
		]
	},
	{
		title: 'Account',
		items: [
			{
				href: '/settings/account',
				label: 'Account',
				icon: ShieldCheck,
				requires: null
			}
		]
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
			return [];
	}
}
