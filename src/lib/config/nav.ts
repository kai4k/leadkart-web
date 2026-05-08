import {
	LayoutDashboard,
	Users,
	ShoppingCart,
	Boxes,
	Truck,
	ListTodo,
	Bell,
	Settings,
	type Icon as LucideIcon
} from 'lucide-svelte';

/**
 * Sidebar navigation config — single source of truth for the signed-in
 * app shell. Filtering by permission happens in Sidebar.svelte against
 * the session principal's permission claim. Industry canon: nav lives
 * in config, not hardcoded in the component (Stripe, Linear, Vercel
 * dashboards all do this).
 *
 * `requires` is a permission-name predicate; null = always visible.
 * Empty string permissions ALSO match always-visible (so the SuperAdmin
 * bypass works without special-casing here).
 */
export interface NavItem {
	href: string;
	label: string;
	icon: typeof LucideIcon;
	/** Permission name required to see this item; null = no gate. */
	requires: string | null;
}

export interface NavSection {
	title?: string;
	items: NavItem[];
}

export const NAV: NavSection[] = [
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
		title: 'Account',
		items: [{ href: '/settings/tenant', label: 'Settings', icon: Settings, requires: null }]
	}
];
