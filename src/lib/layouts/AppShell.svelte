<script lang="ts">
	import Topbar from './Topbar.svelte';
	import Sidebar from './Sidebar.svelte';
	import Footer from './Footer.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import { Drawer } from '$ui';
	import { theme } from '$lib/hooks/use-theme.svelte';

	/**
	 * AppShell — Linear/Vercel-style canonical layout:
	 *   Topbar    — position: fixed, top, full-width, h-topbar
	 *   Sidebar   — position: fixed, top-offset by topbar height,
	 *               full-height column; width animates between
	 *               16rem (expanded) and 4.5rem (collapsed) via the
	 *               --lk-sidebar-width var driven by [data-sidebar-
	 *               collapsed] on <html>.
	 *   main      — padding-top: topbar-height; padding-inline-start:
	 *               sidebar-width on lg+, 0 on mobile.
	 *
	 * Hamburger (in Topbar):
	 *   ≥ lg : toggles theme.sidebarCollapsed (full ⇄ icon-only)
	 *   < lg : opens the mobile drawer (bits-ui Dialog primitive)
	 *
	 * The viewport check uses window.matchMedia at click time so a user
	 * resizing across the breakpoint gets the right action.
	 *
	 * Mobile drawer composes `<Drawer.Root>` (bits-ui Dialog) with a
	 * class override flipping the panel to the left edge. The Drawer
	 * primitive ships right-side only; a `position` prop is the
	 * obvious follow-up enhancement.
	 */

	let { children } = $props();
	let sidebarOpen = $state(false);
	let settingsOpen = $state(false);

	function isDesktop(): boolean {
		return typeof window !== 'undefined' && window.matchMedia('(min-width: 64rem)').matches;
	}

	function onHamburger() {
		if (isDesktop()) theme.toggleSidebarCollapsed();
		else sidebarOpen = true;
	}

	function closeDrawer() {
		sidebarOpen = false;
	}
</script>

<div class="lk-app">
	<Topbar onToggleSidebar={onHamburger} onOpenSettings={() => (settingsOpen = true)} />

	<!-- Desktop fixed sidebar -->
	<aside class="lk-sidebar-mount hidden lg:block" aria-label="Primary navigation">
		<Sidebar onNavigate={closeDrawer} />
	</aside>

	<!-- Mobile drawer — left-side slide-over.
	     Overrides the Drawer primitive's default right-edge geometry
	     (right-0 → left-0, border-l → border-r, slide-in-right →
	     slide-in-left) via tailwind-merge inside cn(). Follow-up:
	     promote a `position="left"` prop into the Drawer primitive. -->
	<Drawer.Root bind:open={sidebarOpen} onOpenChange={(o) => (sidebarOpen = o)}>
		<Drawer.Content
			class="lk-mobile-drawer animate-slide-in-left right-auto left-0 border-r border-l-0 lg:hidden"
		>
			<Sidebar onNavigate={closeDrawer} />
		</Drawer.Content>
	</Drawer.Root>

	<main id="main-content" class="lk-page-wrapper" tabindex="-1">
		<div class="lk-page-inner">
			{@render children()}
		</div>
	</main>

	<Footer />

	<SettingsModal bind:open={settingsOpen} onOpenChange={(o) => (settingsOpen = o)} />
</div>

<style>
	.lk-app {
		min-height: 100dvh;
		background: var(--color-bg);
	}

	/* ─── Page wrapper ────────────────────────────────────────────
	   Offsets the fixed Topbar (top) + Sidebar (inline-start). Safe-
	   area-inset baked into every edge via max() so content never
	   underlaps the home indicator / curved edges. `contain: layout`
	   isolates wrapper reflow from the surrounding shell — common
	   FAANG pattern for app shells so child-page repaints don't
	   bubble to Topbar/Sidebar. */
	.lk-page-wrapper {
		min-height: 100dvh;
		padding-block-start: var(--lk-page-pad-top);
		padding-block-end: calc(
			var(--lk-footer-height) + max(var(--lk-shell-gap), var(--safe-bottom)) + var(--lk-shell-gap)
		);
		padding-inline-start: max(var(--lk-shell-gap), var(--safe-left));
		padding-inline-end: max(var(--lk-shell-gap), var(--safe-right));
		display: flex;
		flex-direction: column;
		contain: layout;
		transition:
			padding-block-start 0.18s ease-out,
			padding-block-end 0.18s ease-out,
			padding-inline-start 0.18s ease-out,
			padding-inline-end 0.18s ease-out;
	}
	@media (min-width: 64rem) {
		.lk-page-wrapper {
			padding-inline-start: calc(var(--lk-sidebar-width) + var(--lk-shell-gap));
		}
	}

	.lk-page-inner {
		flex: 1;
		width: 100%;
		max-inline-size: var(--lk-content-max-width);
		margin-inline: auto;
		padding-block: clamp(1rem, 2.5vw, 1.75rem);
		padding-inline: clamp(0.75rem, 3vw, 1.75rem);
	}

	/* ─── Mobile drawer geometry ──────────────────────────────────
	   Width clamps responsively so it's not cramped on tiny phones
	   nor wastefully wide on tablets. Safe-area-left so the drawer
	   doesn't sit under a curved edge in landscape. The Drawer
	   primitive provides positioning (inset-y-0) and the glass
	   material; this rule only narrows the width to sidebar-scale. */
	:global(.lk-mobile-drawer) {
		inline-size: clamp(17rem, 78vw, 22rem);
		max-inline-size: clamp(17rem, 78vw, 22rem);
		padding-inline-start: var(--safe-left);
	}
</style>
