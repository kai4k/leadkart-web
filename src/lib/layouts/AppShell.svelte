<script lang="ts">
	import { onMount } from 'svelte';
	import Topbar from './Topbar.svelte';
	import Sidebar from './Sidebar.svelte';
	import Footer from './Footer.svelte';
	import SettingsModal from './SettingsModal.svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);
	let settingsOpen = $state(false);
	let drawerEl: HTMLElement | undefined = $state();
	let triggerEl: HTMLElement | null = null;

	function close() {
		sidebarOpen = false;
		triggerEl?.focus();
	}

	function onKey(e: KeyboardEvent) {
		if (!sidebarOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
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

<!--
  Domiex-style fixed-layout shell:
    Topbar      — position: fixed, top, full-width, h-topbar
    Sidebar     — position: fixed, top-offset by topbar height, full-height column
    page-wrapper — padding-top: topbar height, padding-inline-start: sidebar width
                   contains the routed page content + Footer at the bottom
  Mobile (< lg):
    Sidebar hidden; opens as a drawer over content; page-wrapper drops the left padding.
-->
<div class="lk-app">
	<!-- ── Fixed top bar ── -->
	<Topbar
		onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
		onOpenSettings={() => (settingsOpen = true)}
	/>

	<!-- ── Desktop fixed sidebar ── -->
	<aside class="lk-sidebar-mount hidden lg:block" aria-label="Primary navigation">
		<Sidebar onNavigate={close} />
	</aside>

	<!-- ── Mobile drawer (slide-in over content) ── -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm lg:hidden"
			style="z-index: var(--z-overlay);"
			aria-label="Close sidebar"
			onclick={close}
		></button>
		<div
			bind:this={drawerEl}
			role="dialog"
			aria-modal="true"
			aria-label="Primary navigation"
			class="fixed inset-y-0 lg:hidden"
			style="z-index: var(--z-modal); inset-inline-start: 0; animation: slide-in {`var(--duration-base) var(--ease-out)`};"
		>
			<Sidebar onNavigate={close} />
		</div>
	{/if}

	<!-- ── Page wrapper — offset by fixed Topbar (top) + Sidebar (inline-
	     start) + shell-gap (boxed/semibox). The wrapper itself is
	     transparent; the white "card" surface lives in .lk-page-card
	     so boxed mode shows canvas in the outer gap and elevated bg
	     inside the card (Domiex's pattern). ── -->
	<main id="main-content" class="lk-page-wrapper" tabindex="-1">
		<div class="lk-page-card">
			<div class="lk-page-inner">
				{@render children()}
			</div>
			<Footer />
		</div>
	</main>

	<SettingsModal bind:open={settingsOpen} />
</div>

<style>
	/* ─── Root shell — body bg shows through; no outer padding (each
	     fixed surface insets itself via --lk-shell-gap so the shell
	     vars drive the boxed visual end-to-end). ─── */
	.lk-app {
		background: var(--color-bg);
		min-height: 100dvh;
	}

	/* ─── Page wrapper — content region after Topbar + Sidebar +
	     shell-gap offsets. Padding-top accounts for Topbar height
	     PLUS the gap (Topbar sits at top:gap so its bottom edge is
	     at gap + topbar-height). Padding-inline-start accounts for
	     Sidebar width PLUS the gap on lg+; 0 on mobile.  ─── */
	.lk-page-wrapper {
		min-height: 100dvh;
		padding-block-start: calc(var(--lk-topbar-height) + var(--lk-shell-gap));
		padding-block-end: var(--lk-shell-gap);
		padding-inline-start: var(--lk-shell-gap);
		padding-inline-end: var(--lk-shell-gap);
		display: flex;
		flex-direction: column;
		transition:
			padding-block-start 0.2s ease-out,
			padding-block-end 0.2s ease-out,
			padding-inline-start 0.2s ease-out,
			padding-inline-end 0.2s ease-out;
	}
	@media (min-width: 64rem) {
		.lk-page-wrapper {
			padding-inline-start: calc(var(--lk-sidebar-width) + var(--lk-shell-gap));
		}
	}
	/* Horizontal layout — sidebar hidden, drop the inline-start offset
	   to just the shell-gap. */
	:global(:root[data-layout='horizontal']) .lk-page-wrapper {
		padding-inline-start: var(--lk-shell-gap);
	}
	:global(:root[data-layout='horizontal']) .lk-sidebar-mount {
		display: none;
	}

	/* ─── Page card — the visible "page" surface. Transparent in default
	     mode (body canvas shows through), elevated white with radius +
	     subtle shadow in boxed/semibox. ─── */
	.lk-page-card {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--lk-page-bg);
		border-radius: var(--lk-shell-radius);
		box-shadow: var(--lk-shell-shadow);
		transition:
			background 0.2s ease-out,
			border-radius 0.2s ease-out;
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
