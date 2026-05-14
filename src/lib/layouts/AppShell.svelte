<script lang="ts">
	import { onMount } from 'svelte';
	import Topbar from './Topbar.svelte';
	import Sidebar from './Sidebar.svelte';
	import Footer from './Footer.svelte';
	import SettingsModal from './SettingsModal.svelte';
	import { theme } from '$lib/stores/theme.svelte';

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
	 *   < lg : opens the mobile drawer (existing focus-trapped dialog)
	 *
	 * The viewport check uses window.matchMedia at click time so a user
	 * resizing across the breakpoint gets the right action.
	 */

	let { children } = $props();
	let sidebarOpen = $state(false);
	let drawerEl: HTMLElement | undefined = $state();
	let triggerEl: HTMLElement | null = null;

	function isDesktop(): boolean {
		return typeof window !== 'undefined' && window.matchMedia('(min-width: 64rem)').matches;
	}

	function onHamburger() {
		if (isDesktop()) theme.toggleSidebarCollapsed();
		else sidebarOpen = true;
	}

	function closeDrawer() {
		sidebarOpen = false;
		triggerEl?.focus();
	}

	function onKey(e: KeyboardEvent) {
		if (!sidebarOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closeDrawer();
			return;
		}
		if (e.key === 'Tab' && drawerEl) {
			const focusables = drawerEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
			);
			if (focusables.length === 0) return;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	let settingsOpen = $state(false);

	$effect(() => {
		if (sidebarOpen) {
			triggerEl = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			queueMicrotask(() => {
				const first = drawerEl?.querySelector<HTMLElement>(
					'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
				);
				first?.focus();
			});
		} else {
			document.body.style.overflow = '';
		}
	});

	onMount(() => {
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
</script>

<div class="lk-app">
	<!-- Ambient colour blobs — soft, heavily blurred, slow drift. Logo-
	     palette tints give the Liquid-Glass surfaces something varied to
	     refract through. Matches the AuthShell decoration so the two
	     surfaces read as one product. Lower opacity than auth (this is
	     the working surface, not the marketing landing) — content focus. -->
	<div class="lk-app-blobs" aria-hidden="true">
		<span class="lk-blob lk-blob--purple"></span>
		<span class="lk-blob lk-blob--blue"></span>
		<span class="lk-blob lk-blob--green"></span>
	</div>

	<Topbar onToggleSidebar={onHamburger} onOpenSettings={() => (settingsOpen = true)} />

	<!-- Desktop fixed sidebar -->
	<aside class="lk-sidebar-mount hidden lg:block" aria-label="Primary navigation">
		<Sidebar onNavigate={closeDrawer} />
	</aside>

	<!-- Mobile drawer -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm lg:hidden"
			style="z-index: var(--z-overlay);"
			aria-label="Close sidebar"
			onclick={closeDrawer}
		></button>
		<div
			bind:this={drawerEl}
			role="dialog"
			aria-modal="true"
			aria-label="Primary navigation"
			class="lk-drawer fixed inset-y-0 lg:hidden"
			style="animation: slide-in {`var(--duration-base) var(--ease-out)`};"
		>
			<Sidebar onNavigate={closeDrawer} />
		</div>
	{/if}

	<main id="main-content" class="lk-page-wrapper" tabindex="-1">
		<div class="lk-page-inner">
			{@render children()}
		</div>
		<Footer />
	</main>

	<SettingsModal bind:open={settingsOpen} />
</div>

<style>
	.lk-app {
		position: relative;
		min-height: 100dvh;
		background: var(--color-bg);
		overflow-x: clip; /* contain blob overflow horizontally only */
	}

	/* ─── Ambient blob decoration ─────────────────────────────────
	   Three blobs in logo-palette colours drift slowly + heavily-
	   blurred behind every shell surface. Together with the Liquid-
	   Glass topbar/sidebar/popovers, they produce the "alive glass
	   over coloured wash" visual the AuthShell ships. Lower peak
	   opacity than auth (~35% vs ~55%) so working-content surfaces
	   stay legible. position: fixed so blobs stay anchored as the
	   page scrolls. */
	.lk-app-blobs {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.lk-blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		will-change: transform;
	}
	.lk-blob--purple {
		inline-size: 26rem;
		block-size: 26rem;
		top: -8%;
		left: -6%;
		background: color-mix(in srgb, var(--color-logo-purple) 35%, transparent);
		animation: lk-app-drift-a 38s ease-in-out infinite;
	}
	.lk-blob--blue {
		inline-size: 30rem;
		block-size: 30rem;
		top: 30%;
		right: -10%;
		background: color-mix(in srgb, var(--color-logo-blue) 28%, transparent);
		animation: lk-app-drift-b 42s ease-in-out infinite;
	}
	.lk-blob--green {
		inline-size: 22rem;
		block-size: 22rem;
		bottom: -10%;
		left: 30%;
		background: color-mix(in srgb, var(--color-logo-green-on-light) 22%, transparent);
		animation: lk-app-drift-c 36s ease-in-out infinite;
	}
	@keyframes lk-app-drift-a {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 4rem 3rem;
		}
	}
	@keyframes lk-app-drift-b {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: -4rem 5rem;
		}
	}
	@keyframes lk-app-drift-c {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 5rem -3rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.lk-blob {
			animation: none;
		}
	}

	/* ─── Page wrapper ────────────────────────────────────────────
	   Offsets the fixed Topbar (top) + Sidebar (inline-start). Safe-
	   area-inset baked into every edge via max() so content never
	   underlaps the home indicator / curved edges. `contain: layout`
	   isolates wrapper reflow from the surrounding shell — common
	   FAANG pattern for app shells so child-page repaints don't
	   bubble to Topbar/Sidebar. */
	.lk-page-wrapper {
		position: relative;
		z-index: 1; /* stacks above .lk-app-blobs (z-index 0) */
		min-height: 100dvh;
		padding-block-start: var(--lk-page-pad-top);
		padding-block-end: max(var(--lk-shell-gap), var(--safe-bottom));
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

	/* ─── Mobile drawer ────────────────────────────────────────────
	   Width clamps responsively so it's not cramped on tiny phones
	   nor wastefully wide on tablets. Safe-area-left so the drawer
	   doesn't sit under a curved edge in landscape. */
	.lk-drawer {
		inset-inline-start: 0;
		inline-size: clamp(17rem, 78vw, 22rem);
		padding-inline-start: var(--safe-left);
		z-index: var(--z-modal);
	}

	@keyframes slide-in {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		[role='dialog'] {
			animation: none !important;
		}
	}
</style>
