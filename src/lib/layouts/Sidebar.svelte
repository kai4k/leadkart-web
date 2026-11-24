<script lang="ts">
	/**
	 * The sidebar: the shadcn `sidebar` block (collapsible="icon") over the one nav config. Below
	 * `lg` the block renders itself as a Sheet; its open state and size come from the preferences
	 * (`AppShell` maps them onto `Sidebar.Provider`). Widths and geometry come from `layouts.css`.
	 *
	 * The nav is the config (`nav.ts`) filtered by what Go said the caller may do
	 * (`effective_permissions`, SSR-bootstrapped into page.data: no query, no skeleton, no
	 * first-paint pop-in) and by whether an operator is acting inside a tenant. Nothing here looks at
	 * tier, rank or any role flag. The operator scope tree ("Tenant context") is rendered as tabs by
	 * the scope layout from the same config; listing it here too would duplicate every link.
	 */
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { BrandMark, Sidebar } from '#lib/components/ui/index.ts';
	import { isNavActive, shellNav } from '#lib/config/nav.ts';
	import { session } from '#lib/features/auth/index.ts';
	import NavItem from './NavItem.svelte';

	let { onNavigate: onNavigateProp }: { onNavigate?: () => void } = $props();

	// A link followed in the mobile sheet closes it (a client-side navigation keeps this component).
	const block = Sidebar.useSidebar();
	function onNavigate(): void {
		block.setOpenMobile(false);
		onNavigateProp?.();
	}

	const sections = $derived(shellNav(session.capabilities, session.inTenantContext));
</script>

<Sidebar.Root collapsible="icon">
	<!-- The brand: in the topbar for vertical, boxed and horizontal (Task 12); here for modern and
	     semibox, where the sidebar runs up to the top of the page. -->
	<Sidebar.Header
		class="hidden h-(--shell-topbar-height) shrink-0 items-center justify-center border-b border-sidebar-border p-2 [:root[data-layout=modern]_&]:flex [:root[data-layout=semibox]_&]:flex"
	>
		<a
			href={resolve('dashboard')}
			class="flex size-full items-center justify-center rounded-md ring-sidebar-ring outline-none focus-visible:ring-2"
			aria-label={$_('shell.brandHome')}
			onclick={() => onNavigate?.()}
		>
			<BrandMark
				wordmark
				decorative
				tone="sidebar"
				class="text-sidebar-foreground group-data-[collapsible=icon]:hidden"
			/>
			<BrandMark
				decorative
				tone="sidebar"
				class="hidden group-data-[collapsible=icon]:inline-flex"
			/>
		</a>
	</Sidebar.Header>

	<nav aria-label={$_('shell.mainNavigation')} class="flex min-h-0 flex-1 flex-col">
		<Sidebar.Content>
			{#each sections as section (section.id)}
				{#if section.items.length > 0}
					<Sidebar.Group>
						{#if section.title}
							<Sidebar.GroupLabel
								class="h-auto px-4 py-2 text-xs uppercase tracking-wide [:root[data-sidebar=medium]_&]:justify-center"
							>
								{$_(`nav.sections.${section.id}`)}
							</Sidebar.GroupLabel>
						{/if}
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#each section.items as item (item.href)}
									<NavItem
										{item}
										variant="sidebar"
										active={isNavActive(page.url.pathname, item.href)}
										{onNavigate}
									/>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Sidebar.Group>
				{/if}
			{/each}
		</Sidebar.Content>
	</nav>
</Sidebar.Root>
