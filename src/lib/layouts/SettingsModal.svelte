<script lang="ts">
	import { onMount } from 'svelte';
	import { X, Icon } from '$icons';
	import {
		theme,
		PRIMARY_COLORS,
		SIDEBAR_SIZES,
		CONTENT_WIDTHS,
		type PrimaryColor,
		type SidebarSize,
		type ContentWidth
	} from '$lib/stores/theme.svelte';

	/**
	 * SettingsModal — right-side drawer that hosts the theme customiser.
	 *
	 * Sections:
	 *   - Primary colour (11 swatches mapped to data-primary)
	 *   - Sidebar size (default | compact)
	 *   - Content width (default | fluid)
	 *   - Reset all
	 *
	 * Pattern: WAI-ARIA dialog/drawer canon — focus trap, Escape closes,
	 * focus restore on close, backdrop overlay. Mirrors the mobile-nav
	 * drawer in AppShell (same UX).
	 *
	 * Industry refs: Domiex SettingsModal, Vercel Dashboard preferences
	 * panel, Linear settings drawer.
	 */

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let drawerEl: HTMLElement | undefined = $state();
	let triggerEl: HTMLElement | null = null;

	function close() {
		open = false;
		triggerEl?.focus();
	}

	function onKey(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}
		if (e.key === 'Tab' && drawerEl) {
			const focusables = drawerEl.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled])'
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
		if (open) {
			triggerEl = document.activeElement as HTMLElement | null;
			document.body.style.overflow = 'hidden';
			queueMicrotask(() => {
				const first = drawerEl?.querySelector<HTMLElement>(
					'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

	function selectPrimary(id: PrimaryColor) {
		theme.setPrimary(id);
	}
	function selectSidebarSize(id: SidebarSize) {
		theme.setSidebarSize(id);
	}
	function selectContentWidth(id: ContentWidth) {
		theme.setContentWidth(id);
	}
</script>

{#if open}
	<button
		type="button"
		class="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity"
		style="z-index: var(--z-overlay);"
		aria-label="Close settings"
		onclick={close}
	></button>

	<div
		bind:this={drawerEl}
		role="dialog"
		aria-modal="true"
		aria-label="Theme + layout settings"
		class="fixed inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[var(--color-bg-elevated)] shadow-2xl"
		style="z-index: var(--z-modal); animation: slide-in-right {`var(--duration-base) var(--ease-out)`};"
	>
		<header
			class="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4"
		>
			<div>
				<h2 class="h3 text-[var(--color-fg)]">Customise</h2>
				<p class="caption text-[var(--color-fg-muted)]">Theme colour + layout style</p>
			</div>
			<button
				class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
				aria-label="Close"
				onclick={close}
			>
				<Icon icon={X} size="md" />
			</button>
		</header>

		<div class="stack stack-relaxed flex-1 overflow-y-auto px-5 py-5">
			<!-- ── Primary colour ── -->
			<section class="stack stack-tight">
				<div class="stack stack-tight">
					<h3 class="h6">Primary colour</h3>
					<p class="caption text-[var(--color-fg-muted)]">
						Re-skins buttons, links, and brand accents across the app.
					</p>
				</div>
				<div class="grid grid-cols-6 gap-2">
					{#each PRIMARY_COLORS as colour (colour.id)}
						{@const selected = theme.primary === colour.id}
						<button
							type="button"
							class={[
								'aspect-square rounded-md border-2 transition-transform',
								'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
								'focus-visible:ring-[var(--color-brand-500)]',
								selected
									? 'scale-110 border-[var(--color-fg)]'
									: 'border-transparent hover:scale-105'
							]}
							style="background: {colour.hex};"
							aria-label={colour.label}
							aria-pressed={selected}
							title={colour.label}
							onclick={() => selectPrimary(colour.id)}
						></button>
					{/each}
				</div>
			</section>

			<!-- ── Sidebar size ── -->
			<section class="stack stack-tight">
				<div class="stack stack-tight">
					<h3 class="h6">Sidebar</h3>
					<p class="caption text-[var(--color-fg-muted)]">
						Compact mode collapses labels — icon-only navigation.
					</p>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#each SIDEBAR_SIZES as opt (opt.id)}
						{@const selected = theme.sidebarSize === opt.id}
						<button
							type="button"
							class={[
								'rounded-md border px-3 py-2 text-left transition-colors',
								'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
								'focus-visible:ring-[var(--color-brand-500)]',
								selected
									? 'border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
									: 'border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]'
							]}
							aria-pressed={selected}
							onclick={() => selectSidebarSize(opt.id)}
						>
							<span class="body-sm font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- ── Content width ── -->
			<section class="stack stack-tight">
				<div class="stack stack-tight">
					<h3 class="h6">Content width</h3>
					<p class="caption text-[var(--color-fg-muted)]">
						Fluid removes the max-width cap so content spans the full viewport.
					</p>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#each CONTENT_WIDTHS as opt (opt.id)}
						{@const selected = theme.contentWidth === opt.id}
						<button
							type="button"
							class={[
								'rounded-md border px-3 py-2 text-left transition-colors',
								'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
								'focus-visible:ring-[var(--color-brand-500)]',
								selected
									? 'border-[var(--color-brand-600)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
									: 'border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]'
							]}
							aria-pressed={selected}
							onclick={() => selectContentWidth(opt.id)}
						>
							<span class="body-sm font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>
		</div>

		<div class="border-t border-[var(--color-border)] px-5 py-4">
			<button
				type="button"
				class={[
					'body-sm w-full rounded-md border border-[var(--color-border)] px-4 py-2 font-medium',
					'text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-muted)]',
					'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'focus-visible:ring-[var(--color-brand-500)]'
				]}
				onclick={() => theme.reset()}
			>
				Reset to defaults
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in-right {
		from {
			transform: translateX(100%);
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
