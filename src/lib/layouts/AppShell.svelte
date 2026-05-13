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
			class="fixed inset-y-0 lg:hidden"
			style="z-index: var(--z-modal); inset-inline-start: 0; inline-size: min(20rem, 85vw); animation: slide-in {`var(--duration-base) var(--ease-out)`};"
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
		min-height: 100dvh;
		background: var(--color-bg);
	}

	.lk-page-wrapper {
		min-height: 100dvh;
		padding-block-start: var(--lk-page-pad-top);
		padding-block-end: var(--lk-shell-gap);
		padding-inline-start: var(--lk-shell-gap);
		padding-inline-end: var(--lk-shell-gap);
		display: flex;
		flex-direction: column;
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
		padding: clamp(1rem, 2.5vw, 1.75rem);
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
