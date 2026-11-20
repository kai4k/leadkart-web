<script lang="ts">
	/**
	 * AppShell: one shell for every layout. The preferences are `<html data-*>` attributes written at
	 * SSR; `styles/theme/layouts.css` turns them into geometry, so a change never re-renders a
	 * component. The one structural branch is `layout=horizontal`, which swaps the sidebar for the
	 * horizontal nav (below `lg` the sidebar's sheet is the navigation in every layout).
	 *
	 *   Sidebar.Provider    the shadcn sidebar block's state, controlled by the `sidebar` preference
	 *     Sidebar | HorizontalNav
	 *     Topbar            placed by layouts.css
	 *     content column    offset by `--shell-content-start`
	 *       banners         tenant context + impersonation, sticky under the topbar
	 *       main#main-content > PageContainer > page
	 *       Footer          at the end of the column, not fixed
	 */
	import type { Component, Snippet } from 'svelte';
	import Topbar from './Topbar.svelte';
	import TenantContextBanner from './TenantContextBanner.svelte';
	import Sidebar from './Sidebar.svelte';
	import HorizontalNav from './HorizontalNav.svelte';
	import PageContainer from './PageContainer.svelte';
	import Footer from './Footer.svelte';
	import { createSidebarSizing } from './sidebar-sizing.ts';
	import { Sidebar as SidebarBlock } from '$ui';
	import { getPreferences } from '$features/preferences';
	import { createIsMobile } from '#lib/hooks/is-mobile.svelte.ts';

	let { children, banner }: { children: Snippet; banner?: Snippet } = $props();
	const prefs = getPreferences();
	const isMobile = createIsMobile();
	const sizing = createSidebarSizing(prefs);
	const horizontal = $derived(prefs.layout === 'horizontal');
	let customizerOpen = $state(false);

	// The customizer is opened on demand (the average session hits it ~0 times). Its sheet and the
	// tiles' CSS load on the first click; focus returns to the Topbar button when it closes.
	let CustomizerCmp = $state<Component<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}> | null>(null);

	async function openCustomizer(): Promise<void> {
		if (!CustomizerCmp) {
			const mod = await import('./ThemeCustomizer.svelte');
			CustomizerCmp = mod.default as unknown as Component<{
				open: boolean;
				onOpenChange: (open: boolean) => void;
			}>;
		}
		customizerOpen = true;
	}
</script>

<SidebarBlock.Provider
	open={sizing.open}
	onOpenChange={sizing.setOpen}
	shortcutEnabled={!horizontal || isMobile.current}
	class="block min-h-dvh"
>
	<div data-shell="root" class="relative min-h-dvh">
		{#if horizontal}<HorizontalNav />{/if}
		<!-- Horizontal on a phone: the same sheet as every other layout. -->
		{#if !horizontal || isMobile.current}<Sidebar />{/if}

		<Topbar onOpenCustomizer={() => void openCustomizer()} />

		<div data-shell="content">
			<!-- The context banners (acting in a tenant, impersonating): under the topbar, not scrolled
			     away, never hidden by a layout; they read committed page data. layouts.css places them. -->
			<div data-shell="banners">
				<TenantContextBanner />
				{@render banner?.()}
			</div>
			<main id="main-content" class="flex-1 pt-(--shell-main-pad-top) outline-none" tabindex="-1">
				<PageContainer>
					{@render children()}
				</PageContainer>
			</main>
			<Footer />
		</div>

		{#if CustomizerCmp}
			<CustomizerCmp bind:open={customizerOpen} onOpenChange={(o) => (customizerOpen = o)} />
		{/if}
	</div>
</SidebarBlock.Provider>
