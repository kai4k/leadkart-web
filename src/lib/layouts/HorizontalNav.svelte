<script lang="ts">
	/**
	 * HorizontalNav: the `horizontal` layout's navigation, from the same nav config as the sidebar
	 * (same capability and tenant-context filtering). A titled section is one dropdown whose items
	 * are links; a section without a title (Dashboard) is a direct link. The section that holds the
	 * current page marks its trigger `aria-current="true"`; the link itself keeps `aria-current="page"`.
	 * Below `lg` the sidebar's sheet is the navigation, so this bar is not shown.
	 */
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { DropdownMenu } from '$ui';
	import { ChevronDown } from '#lib/icons/index.ts';
	import { isNavActive, shellNav } from '#lib/config/nav.ts';
	import { NAV_ICONS } from '#lib/config/nav-icons.ts';
	import { session } from '$features/auth';
	import NavItem from './NavItem.svelte';

	const sections = $derived(shellNav(session.capabilities, session.inTenantContext));

	const item =
		'flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring aria-[current]:text-sidebar-accent-foreground data-[state=open]:text-sidebar-accent-foreground';
</script>

<nav
	data-shell="hnav"
	aria-label={$_('shell.mainNavigation')}
	class="hidden items-center border-b border-sidebar-border bg-sidebar px-(--shell-page-pad-x) lg:flex"
>
	<ul class="flex min-w-0 items-center gap-1">
		{#each sections as section (section.id)}
			{#if section.title}
				{@const holdsPage = section.items.some((i) => isNavActive(page.url.pathname, i.href))}
				<li>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class={item} aria-current={holdsPage ? 'true' : undefined}>
							{$_(`nav.sections.${section.id}`)}
							<ChevronDown class="size-4" aria-hidden="true" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start" class="min-w-48">
							{#each section.items as entry (entry.href)}
								<NavItem
									item={entry}
									variant="menu"
									active={isNavActive(page.url.pathname, entry.href)}
								/>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</li>
			{:else}
				{#each section.items as entry (entry.href)}
					{@const Icon = NAV_ICONS[entry.key]}
					{@const active = isNavActive(page.url.pathname, entry.href)}
					<li>
						<a href={entry.href} aria-current={active ? 'page' : undefined} class={item}>
							<Icon class="size-4" aria-hidden="true" />
							{$_(`nav.items.${entry.key}`)}
						</a>
					</li>
				{/each}
			{/if}
		{/each}
	</ul>
</nav>
