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
		// Return focus to whatever invoked the drawer (canon: WAI-ARIA
		// dialog / menu / drawer pattern requires focus restore).
		triggerEl?.focus();
	}

	function onKey(e: KeyboardEvent) {
		if (!sidebarOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		// Focus trap — Tab cycles within the drawer.
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
			// Focus the first focusable inside the drawer once mounted.
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

<div class="flex h-dvh flex-col">
	<Topbar
		onToggleSidebar={() => (sidebarOpen = !sidebarOpen)}
		onOpenSettings={() => (settingsOpen = true)}
	/>
	<div class="flex min-h-0 flex-1">
		<!-- Desktop sidebar — always visible. -->
		<aside class="hidden lg:block">
			<Sidebar onNavigate={close} />
		</aside>

		<!-- Mobile sidebar — drawer with focus trap + Escape + scroll lock. -->
		{#if sidebarOpen}
			<button
				type="button"
				class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity lg:hidden"
				style="z-index: var(--z-overlay);"
				aria-label="Close sidebar"
				onclick={close}
			></button>
			<div
				bind:this={drawerEl}
				role="dialog"
				aria-modal="true"
				aria-label="Main navigation"
				class="fixed inset-y-0 left-0 lg:hidden"
				style="z-index: var(--z-modal); animation: slide-in {`var(--duration-base) var(--ease-out)`};"
			>
				<Sidebar onNavigate={close} />
			</div>
		{/if}

		<main
			id="main-content"
			class="min-w-0 flex-1 overflow-y-auto bg-[var(--color-bg)]"
			tabindex="-1"
		>
			<div class="center py-6" style="--center-width: var(--lk-content-max-width);">
				{@render children()}
			</div>
		</main>
	</div>
	<Footer />

	<SettingsModal bind:open={settingsOpen} />
</div>

<style>
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
