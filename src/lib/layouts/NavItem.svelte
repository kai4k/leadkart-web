<script lang="ts">
	/**
	 * NavItem: one entry of the nav config, in two shapes.
	 *
	 *   sidebar  a `Sidebar.MenuButton` wrapping the link. The ACTIVE item is a tinted capsule
	 *            (`sidebar-accent`, a translucent tint gated on the glass composites) at every size, marked by a 3px inline-start indicator bar (`sidebar-indicator`, a 3:1 mark, present collapsed too); the active icon and label are `sidebar-accent-foreground`, inactive icons are the muted `sidebar-icon`; at `large` hover changes
	 *            only the text colour, at `medium` and `small` hover gets the fill too, and (medium)
	 *            the icon sits above a centred label, (small) the icon only. The tooltip carries the name of an icon-only item and the label stays in the
	 *            accessible name (sr-only), so a collapsed sidebar still exposes every item.
	 *   menu     a `DropdownMenu.Item` wrapping the link (the horizontal nav's dropdowns).
	 *
	 * `aria-current="page"` marks the active entry in both shapes.
	 */
	import { _ } from 'svelte-i18n';
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
	const label = $derived($_(`nav.items.${item.key}`));
</script>

{#if variant === 'sidebar'}
	<Sidebar.MenuItem
		class="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center"
	>
		<Sidebar.MenuButton
			isActive={active}
			tooltipContent={label}
			class="relative h-auto min-h-10 gap-3 rounded-full px-4 py-2.5 data-active:before:pointer-events-none data-active:before:absolute data-active:before:start-1.5 data-active:before:top-1/2 data-active:before:h-4 data-active:before:w-0.75 data-active:before:-translate-y-1/2 data-active:before:rounded-full data-active:before:bg-sidebar-indicator hover:bg-transparent active:bg-transparent data-active:bg-sidebar-accent data-active:hover:bg-sidebar-accent data-active:active:bg-sidebar-accent data-active:font-medium data-active:text-sidebar-accent-foreground [:root[data-sidebar=medium]_&]:rounded-2xl [:root[data-sidebar=medium]_&]:mx-3 [:root[data-sidebar=medium]_&]:w-auto [:root[data-sidebar=medium]_&]:flex-col [:root[data-sidebar=medium]_&]:gap-1.5 [:root[data-sidebar=medium]_&]:py-3 [:root[data-sidebar=medium]_&]:text-center [:root[data-sidebar=medium]_&]:text-xs [:root[data-sidebar=medium]_&]:hover:bg-sidebar-accent [:root[data-sidebar=medium]_&]:data-active:bg-sidebar-accent group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:hover:bg-sidebar-accent group-data-[collapsible=icon]:data-active:bg-sidebar-accent [:root:not([data-sidebar=large])_&_svg]:size-5!"
		>
			{#snippet child({ props })}
				<a
					{...props}
					href={item.href}
					aria-current={active ? 'page' : undefined}
					onclick={() => onNavigate?.()}
				>
					<NavIcon
						class={active ? 'text-sidebar-accent-foreground' : 'text-sidebar-icon'}
						aria-hidden="true"
					/>
					<span class="group-data-[collapsible=icon]:sr-only">{label}</span>
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
					active && 'font-medium text-primary-text'
				]}
			>
				<NavIcon class="size-4 shrink-0" aria-hidden="true" />
				<span>{label}</span>
			</a>
		{/snippet}
	</DropdownMenu.Item>
{/if}
