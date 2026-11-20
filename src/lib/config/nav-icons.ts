/**
 * Icons for the entries of `nav.ts`. Client renderers only (the nav config
 * itself stays pure so server guards can import it). `Record<NavRouteKey, …>`
 * makes a new route without an icon a type error.
 */
import {
	Activity,
	Boxes,
	Building2,
	FileText,
	Inbox,
	LayoutDashboard,
	Search,
	Settings,
	ShieldCheck,
	ShoppingCart,
	UserCog,
	Users,
	type LucideIcon
} from '#lib/icons/index.ts';
import type { NavRouteKey } from './nav.ts';

export const NAV_ICONS: Record<NavRouteKey, LucideIcon> = {
	dashboard: LayoutDashboard,
	tenants: Building2,
	persons: Search,
	scope: Building2,
	scopeProfile: Building2,
	scopeMembers: Users,
	scopeRoles: UserCog,
	scopeActivity: Activity,
	scopeSettings: Settings,
	tenantSettings: Settings,
	roleNew: ShieldCheck,
	team: Users,
	roles: ShieldCheck,
	leads: Users,
	orders: ShoppingCart,
	quotations: FileText,
	inventory: Boxes,
	permissionRequests: Inbox,
	account: ShieldCheck
};
