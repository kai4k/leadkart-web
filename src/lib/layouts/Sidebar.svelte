<script lang="ts">
	import { LayoutDashboard, Users, ShoppingCart, Boxes, Truck, ListTodo, Bell } from 'lucide-svelte';
	import { page } from '$app/state';

	type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

	const items: NavItem[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/leads', label: 'Leads', icon: Users },
		{ href: '/orders', label: 'Orders', icon: ShoppingCart },
		{ href: '/inventory', label: 'Inventory', icon: Boxes },
		{ href: '/dispatch', label: 'Dispatch', icon: Truck },
		{ href: '/tasks', label: 'Tasks', icon: ListTodo },
		{ href: '/notifications', label: 'Notifications', icon: Bell }
	];

	function isActive(href: string): boolean {
		return page.url.pathname.startsWith(href);
	}
</script>

<nav
	class="flex h-full w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
>
	<ul class="flex-1 space-y-1 p-3">
		{#each items as item}
			{@const Icon = item.icon}
			<li>
				<a
					href={item.href}
					class={[
						'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
						isActive(item.href)
							? 'bg-brand-50 text-brand-700 dark:bg-brand-700/20 dark:text-brand-100'
							: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
					]}
				>
					<Icon size={18} />
					<span>{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
