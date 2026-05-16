<script lang="ts">
	import { onMount } from 'svelte';
	import { X, RotateCcw, Icon } from '$icons';
	import {
		theme,
		PRIMARY_COLORS,
		CONTENT_WIDTHS,
		type PrimaryColor,
		type ContentWidth
	} from '$lib/stores/theme.svelte';

	/**
	 * SettingsModal — right-side drawer. Two legitimate axes that real
	 * SaaS products expose to end users: brand colour and content
	 * width (boxed / fluid). The chrome shape (semibox) is fixed; the
	 * previous default-layout / dark-sidebar / RTL toggles were
	 * removed 2026-05-17 as theme-marketplace cruft.
	 *
	 * WAI-ARIA dialog canon: focus trap, Escape closes, focus restore,
	 * backdrop overlay.
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
		aria-label="Theme settings"
		class="lk-settings-drawer glass-card fixed inset-y-0 right-0 flex w-full max-w-sm flex-col"
		style="animation: slide-in-right {`var(--duration-base) var(--ease-out)`};"
	>
		<header
			class="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4"
		>
			<div>
				<h2 class="h4 text-[var(--color-fg)]">Appearance</h2>
				<p class="caption text-[var(--color-fg-muted)]">Brand colour and content width</p>
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
				<h3 class="h6">Brand colour</h3>
				<p class="caption text-[var(--color-fg-muted)]">
					Re-skins primary surfaces across the app.
				</p>
				<div class="flex flex-wrap items-center gap-3">
					{#each PRIMARY_COLORS as colour (colour.id)}
						{@const selected = theme.primary === colour.id}
						<button
							type="button"
							class={['lk-swatch', selected && 'lk-swatch--selected']}
							style="background: {colour.hex};"
							aria-label={colour.label}
							aria-pressed={selected}
							title={colour.label}
							onclick={() => theme.setPrimary(colour.id as PrimaryColor)}
						></button>
					{/each}
				</div>
			</section>

			<!-- ── Content width ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Content width</h3>
				<div class="grid grid-cols-2 gap-2">
					{#each CONTENT_WIDTHS as opt (opt.id)}
						{@const selected = theme.contentWidth === opt.id}
						<button
							type="button"
							class={['lk-pref-card', selected && 'lk-pref-card--selected']}
							aria-pressed={selected}
							onclick={() => theme.setContentWidth(opt.id as ContentWidth)}
						>
							<span class={`lk-cw-preview lk-cw-preview--${opt.id}`} aria-hidden="true">
								<span class="lk-cw-preview-body"></span>
							</span>
							<span class="label-small">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>
		</div>

		<div
			class="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4"
		>
			<button
				type="button"
				class={[
					'label inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2',
					'text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-muted)]',
					'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'focus-visible:ring-[var(--color-focus-ring)]'
				]}
				onclick={() => theme.reset()}
			>
				<Icon icon={RotateCcw} size="sm" />
				Reset to defaults
			</button>
		</div>
	</div>
{/if}

<style>
	/* Drawer layout — composes .glass-card material; overrides for the
	   edge-anchored geometry (right-attached, full viewport height,
	   border on inline-start only, no radius on viewport-flush edges).
	   `position: fixed` is set EXPLICITLY here because .glass-card
	   declares `position: relative` (needed to anchor its ::before
	   inner-gradient pseudo). Without this override the drawer falls
	   out of fixed positioning into normal document flow. */
	.lk-settings-drawer {
		position: fixed;
		z-index: var(--z-modal);
		padding-block-start: var(--safe-top);
		padding-block-end: var(--safe-bottom);
		padding-inline-end: var(--safe-right);
		border: 0;
		border-inline-start: var(--glass-border-subtle);
		border-radius: 0;
	}

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

	.lk-pref-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
		padding: 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-elevated);
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
	}
	.lk-pref-card:active {
		background: var(--color-bg-subtle);
	}
	.lk-pref-card--selected {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
		color: var(--color-primary);
	}
	.lk-pref-card--selected .label-small {
		color: var(--color-primary);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-pref-card:hover {
			background: var(--color-bg-muted);
		}
	}
	@media (pointer: coarse) {
		.lk-pref-card {
			min-block-size: var(--lk-touch-target-min);
			padding: 0.75rem;
		}
	}

	/* ── Content-width previews ── */
	.lk-cw-preview {
		position: relative;
		display: block;
		height: 2.25rem;
		border-radius: 0.375rem;
		background: var(--color-bg-muted);
		overflow: hidden;
		padding: 0.3rem;
	}
	.lk-cw-preview-body {
		position: absolute;
		background: var(--color-bg-elevated);
		border-radius: 2px;
		top: 0.3rem;
		bottom: 0.3rem;
	}
	.lk-cw-preview--default .lk-cw-preview-body {
		left: 22%;
		right: 22%;
	}
	.lk-cw-preview--fluid .lk-cw-preview-body {
		left: 0.3rem;
		right: 0.3rem;
	}

	.lk-swatch {
		display: block;
		inline-size: 1.75rem;
		block-size: 1.75rem;
		border-radius: 9999px;
		border: 2px solid transparent;
		cursor: pointer;
		transition:
			transform 0.15s,
			border-color 0.15s;
	}
	.lk-swatch:active {
		transform: scale(0.95);
	}
	@media (hover: hover) and (pointer: fine) {
		.lk-swatch:hover {
			transform: scale(1.1);
		}
	}
	@media (pointer: coarse) {
		.lk-swatch {
			inline-size: 2.25rem;
			block-size: 2.25rem;
		}
	}
	.lk-swatch--selected {
		border-color: var(--color-fg);
		box-shadow: 0 0 0 2px var(--color-bg-elevated);
	}
</style>
