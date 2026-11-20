<script lang="ts">
	/**
	 * NavItem: one entry of the nav config, in two shapes.
	 *
	 *   sidebar  a `Sidebar.MenuButton` wrapping the link. At `large` the item changes only its text
	 *            colour on hover and when active; at `medium` and `small` it gets the tinted
	 *            `sidebar-accent` fill and (medium) the icon above a centred label, (small) the icon
	 *            only. The tooltip carries the name of an icon-only item and the label stays in the
	 *            accessible name (sr-only), so a collapsed sidebar still exposes every item.
	 *   menu     a `DropdownMenu.Item` wrapping the link (the horizontal nav's dropdowns).
	 *
	 * `aria-current="page"` marks the active entry in both shapes.
	 */
	import { DropdownMenu, Sidebar } from '$ui';
	import { NAV_ICONS } from '#lib/config/nav-icons.ts';
	import type { VisibleNavItem } from '#lib/config/nav.ts';

	let {
		item,
		active,
		variant,
		onNavigate
	}: {
		item: VisibleNavItem;
		active: boolean;
		variant: 'sidebar' | 'menu';
		onNavigate?: () => void;
	} = $props();

	const NavIcon = $derived(NAV_ICONS[item.key]);
</script>

{#if variant === 'sidebar'}
	<Sidebar.MenuItem
		class="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
	>
		<Sidebar.MenuButton
			isActive={active}
			tooltipContent={item.label}
			class="h-auto min-h-10 gap-3 px-4 py-2.5 hover:bg-transparent active:bg-transparent data-active:bg-transparent data-active:font-normal data-active:text-sidebar-accent-foreground [:root[data-sidebar=medium]_&]:mx-3 [:root[data-sidebar=medium]_&]:w-auto [:root[data-sidebar=medium]_&]:flex-col [:root[data-sidebar=medium]_&]:gap-1.5 [:root[data-sidebar=medium]_&]:py-3 [:root[data-sidebar=medium]_&]:text-center [:root[data-sidebar=medium]_&]:text-xs [:root[data-sidebar=medium]_&]:hover:bg-sidebar-accent [:root[data-sidebar=medium]_&]:data-active:bg-sidebar-accent group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:data-active:bg-sidebar-accent [:root:not([data-sidebar=large])_&_svg]:size-5!"
		>
			{#snippet child({ props })}
				<a
					{...props}
					href={item.href}
					aria-current={active ? 'page' : undefined}
					onclick={() => onNavigate?.()}
				>
					<NavIcon aria-hidden="true" />
					<span class="group-data-[collapsible=icon]:sr-only">{item.label}</span>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
{:else}
	<DropdownMenu.Item class="p-0">
		{#snippet child({ props })}
			<a
				{...props}
				href={item.href}
				aria-current={active ? 'page' : undefined}
				onclick={() => onNavigate?.()}
				class={[
					props.class as string | undefined,
					'flex w-full items-center gap-2 rounded-md px-3 py-2',
					active && 'font-medium text-primary'
				]}
			>
				<NavIcon class="size-4 shrink-0" aria-hidden="true" />
				<span>{item.label}</span>
			</a>
		{/snippet}
	</DropdownMenu.Item>
{/if}
