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
	 *       main#main-content > PageContainer > page
	 *       Footer          at the end of the column, not fixed
	 */
	import type { Component } from 'svelte';
	import Topbar from './Topbar.svelte';
	import Sidebar from './Sidebar.svelte';
	import HorizontalNav from './HorizontalNav.svelte';
	import PageContainer from './PageContainer.svelte';
	import Footer from './Footer.svelte';
	import { Sidebar as SidebarBlock } from '$ui';
	import { getPreferences } from '$features/preferences';
	import { createIsMobile } from '#lib/hooks/is-mobile.svelte.ts';

	let { children } = $props();
	const prefs = getPreferences();
	const isMobile = createIsMobile();
	const horizontal = $derived(prefs.layout === 'horizontal');
	let settingsOpen = $state(false);

	// Theme/layout settings are opened on demand (the average session hits them ~0 times). Defer the
	// SettingsModal compound and its Dialog dependency to the first click.
	let SettingsModalCmp = $state<Component<{
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}> | null>(null);

	async function openSettings(): Promise<void> {
		if (!SettingsModalCmp) {
			const mod = await import('./SettingsModal.svelte');
			SettingsModalCmp = mod.default as unknown as Component<{
				open: boolean;
				onOpenChange: (open: boolean) => void;
			}>;
		}
		settingsOpen = true;
	}
</script>

<SidebarBlock.Provider
	open={prefs.sidebar !== 'small'}
	onOpenChange={(open) => prefs.set({ sidebar: open ? 'large' : 'small' })}
	class="block min-h-dvh"
>
	<div data-shell="root" class="relative min-h-dvh">
		{#if horizontal}<HorizontalNav />{/if}
		<!-- Horizontal on a phone: the same sheet as every other layout. -->
		{#if !horizontal || isMobile.current}<Sidebar />{/if}

		<Topbar onOpenSettings={() => void openSettings()} />

		<div data-shell="content">
			<main id="main-content" class="flex-1 pt-(--shell-page-pad-top) outline-none" tabindex="-1">
				<PageContainer>
					{@render children()}
				</PageContainer>
			</main>
			<Footer />
		</div>

		{#if SettingsModalCmp}
			<SettingsModalCmp bind:open={settingsOpen} onOpenChange={(o) => (settingsOpen = o)} />
		{/if}
	</div>
</SidebarBlock.Provider>
