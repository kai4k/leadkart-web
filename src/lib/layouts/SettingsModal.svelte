<script lang="ts">
	import { onMount } from 'svelte';
	import { X, RotateCcw, Icon } from '$icons';
	import {
		theme,
		PRIMARY_COLORS,
		LAYOUT_MODES,
		SIDEBAR_SIZES,
		SIDEBAR_COLORS,
		CONTENT_WIDTHS,
		LAYOUT_DIRS,
		type PrimaryColor,
		type LayoutMode,
		type SidebarSize,
		type SidebarColor,
		type ContentWidth,
		type LayoutDir
	} from '$lib/stores/theme.svelte';

	/**
	 * SettingsModal — right-side drawer hosting the full theme customiser.
	 * Modelled on Domiex SettingsModal: visual radio-card grids for layout
	 * + sidebar size, colour swatches for sidebar + primary colour pickers,
	 * binary toggles for direction + content width. Reset-to-defaults
	 * button in the footer.
	 *
	 * WAI-ARIA dialog canon: focus trap, Escape closes, focus restore on
	 * close, backdrop overlay.
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
		aria-label="Theme + layout settings"
		class="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-[var(--color-bg-elevated)] shadow-2xl"
		style="z-index: var(--z-modal); animation: slide-in-right {`var(--duration-base) var(--ease-out)`};"
	>
		<header
			class="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4"
		>
			<div>
				<h2 class="h4 text-[var(--color-fg)]">Customise</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Layout, theme colour, sidebar — applied live across the app
				</p>
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
			<!-- ── Layout mode ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Layout</h3>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each LAYOUT_MODES as opt (opt.id)}
						{@const selected = theme.layoutMode === opt.id}
						<button
							type="button"
							class={['lk-pref-card', selected && 'lk-pref-card--selected']}
							aria-pressed={selected}
							onclick={() => theme.setLayoutMode(opt.id as LayoutMode)}
						>
							<span class={`lk-layout-preview lk-layout-preview--${opt.id}`} aria-hidden="true">
								<span class="lk-layout-bar lk-layout-bar--side"></span>
								<span class="lk-layout-bar lk-layout-bar--top"></span>
								<span class="lk-layout-bar lk-layout-bar--body"></span>
							</span>
							<span class="caption font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- ── Sidebar size ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Sidebar size</h3>
				<div class="grid grid-cols-3 gap-2">
					{#each SIDEBAR_SIZES as opt (opt.id)}
						{@const selected = theme.sidebarSize === opt.id}
						<button
							type="button"
							class={['lk-pref-card', selected && 'lk-pref-card--selected']}
							aria-pressed={selected}
							onclick={() => theme.setSidebarSize(opt.id as SidebarSize)}
						>
							<span class={`lk-sidebar-preview lk-sidebar-preview--${opt.id}`} aria-hidden="true">
								<span class="lk-sidebar-preview-aside"></span>
								<span class="lk-sidebar-preview-body"></span>
							</span>
							<span class="caption font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- ── Sidebar colour ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Sidebar colour</h3>
				<div class="flex flex-wrap items-center gap-3">
					{#each SIDEBAR_COLORS as opt (opt.id)}
						{@const selected = theme.sidebarColor === opt.id}
						<button
							type="button"
							class={['lk-swatch lk-swatch--lg', selected && 'lk-swatch--selected']}
							style="background: {opt.swatch};"
							aria-label={opt.label}
							aria-pressed={selected}
							title={opt.label}
							onclick={() => theme.setSidebarColor(opt.id as SidebarColor)}
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
							<span class={`lk-content-preview lk-content-preview--${opt.id}`} aria-hidden="true">
								<span class="lk-content-preview-body"></span>
							</span>
							<span class="caption font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- ── Direction ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Direction</h3>
				<div class="grid grid-cols-2 gap-2">
					{#each LAYOUT_DIRS as opt (opt.id)}
						{@const selected = theme.layoutDir === opt.id}
						<button
							type="button"
							class={['lk-pref-card', selected && 'lk-pref-card--selected']}
							aria-pressed={selected}
							onclick={() => theme.setLayoutDir(opt.id as LayoutDir)}
						>
							<span class={`lk-dir-preview lk-dir-preview--${opt.id}`} aria-hidden="true">
								<span class="lk-dir-preview-aside"></span>
								<span class="lk-dir-preview-body"></span>
							</span>
							<span class="caption font-medium">{opt.label}</span>
						</button>
					{/each}
				</div>
			</section>

			<!-- ── Primary colour ── -->
			<section class="stack stack-tight">
				<h3 class="h6">Primary colour</h3>
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
		</div>

		<div
			class="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4"
		>
			<button
				type="button"
				class={[
					'body-sm inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 font-medium',
					'text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-muted)]',
					'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'focus-visible:ring-[var(--color-brand-500)]'
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

	/* ── Radio-card pattern — visual selectable preview tile ── */
	.lk-pref-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.375rem;
		padding: 0.625rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-bg-elevated);
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s,
			transform 0.15s;
	}
	.lk-pref-card:hover {
		background: var(--color-bg-muted);
	}
	.lk-pref-card:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
	}
	.lk-pref-card--selected {
		border-color: var(--color-brand-600);
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}
	.lk-pref-card--selected .caption {
		color: var(--color-brand-700);
	}

	/* ── Layout-mode previews — schematic mini-diagrams ── */
	.lk-layout-preview {
		position: relative;
		display: block;
		height: 3rem;
		border-radius: 0.25rem;
		background: var(--color-bg-muted);
		overflow: hidden;
	}
	.lk-layout-bar {
		position: absolute;
		background: var(--color-fg-muted);
		opacity: 0.55;
		border-radius: 1px;
	}
	/* Default — sidebar left, topbar top, body fills */
	.lk-layout-preview--default .lk-layout-bar--side {
		inset: 0 auto 0 0;
		width: 22%;
		background: var(--color-fg);
	}
	.lk-layout-preview--default .lk-layout-bar--top {
		inset: 0 0 auto 22%;
		height: 25%;
	}
	.lk-layout-preview--default .lk-layout-bar--body {
		inset: 25% 0 0 22%;
		background: var(--color-bg-elevated);
		opacity: 1;
	}
	/* Horizontal — full-width topbar, no side, body fills */
	.lk-layout-preview--horizontal .lk-layout-bar--side {
		display: none;
	}
	.lk-layout-preview--horizontal .lk-layout-bar--top {
		inset: 0 0 auto 0;
		height: 25%;
		background: var(--color-fg);
	}
	.lk-layout-preview--horizontal .lk-layout-bar--body {
		inset: 25% 0 0 0;
		background: var(--color-bg-elevated);
		opacity: 1;
	}
	/* Modern — narrow sidebar */
	.lk-layout-preview--modern .lk-layout-bar--side {
		inset: 0 auto 0 0;
		width: 12%;
		background: var(--color-fg);
	}
	.lk-layout-preview--modern .lk-layout-bar--top {
		inset: 0 0 auto 12%;
		height: 25%;
	}
	.lk-layout-preview--modern .lk-layout-bar--body {
		inset: 25% 0 0 12%;
		background: var(--color-bg-elevated);
		opacity: 1;
	}
	/* Boxed — same as default but with outer padding */
	.lk-layout-preview--boxed {
		padding: 0.2rem;
		background: var(--color-bg-subtle);
	}
	.lk-layout-preview--boxed .lk-layout-bar--side {
		inset: 0.2rem auto 0.2rem 0.2rem;
		width: 20%;
		background: var(--color-fg);
		border-radius: 2px;
	}
	.lk-layout-preview--boxed .lk-layout-bar--top {
		inset: 0.2rem 0.2rem auto calc(20% + 0.4rem);
		height: 25%;
		border-radius: 2px;
	}
	.lk-layout-preview--boxed .lk-layout-bar--body {
		inset: calc(25% + 0.4rem) 0.2rem 0.2rem calc(20% + 0.4rem);
		background: var(--color-bg-elevated);
		opacity: 1;
		border-radius: 2px;
	}
	/* Semibox — sidebar boxed, topbar full */
	.lk-layout-preview--semibox {
		padding: 0.2rem;
		background: var(--color-bg-subtle);
	}
	.lk-layout-preview--semibox .lk-layout-bar--side {
		inset: 0.2rem auto 0.2rem 0.2rem;
		width: 20%;
		background: var(--color-fg);
		border-radius: 2px;
	}
	.lk-layout-preview--semibox .lk-layout-bar--top {
		inset: 0.2rem 0.2rem auto calc(20% + 0.4rem);
		height: 25%;
	}
	.lk-layout-preview--semibox .lk-layout-bar--body {
		inset: calc(25% + 0.4rem) 0.2rem 0.2rem calc(20% + 0.4rem);
		background: var(--color-bg-elevated);
		opacity: 1;
	}

	/* ── Sidebar-size previews ── */
	.lk-sidebar-preview {
		position: relative;
		display: block;
		height: 2.5rem;
		border-radius: 0.25rem;
		background: var(--color-bg-muted);
		overflow: hidden;
	}
	.lk-sidebar-preview-aside {
		position: absolute;
		inset: 0 auto 0 0;
		background: var(--color-fg);
	}
	.lk-sidebar-preview-body {
		position: absolute;
		inset: 0;
		background: var(--color-bg-elevated);
	}
	.lk-sidebar-preview--default .lk-sidebar-preview-aside {
		width: 28%;
	}
	.lk-sidebar-preview--default .lk-sidebar-preview-body {
		left: 28%;
	}
	.lk-sidebar-preview--medium .lk-sidebar-preview-aside {
		width: 18%;
	}
	.lk-sidebar-preview--medium .lk-sidebar-preview-body {
		left: 18%;
	}
	.lk-sidebar-preview--small .lk-sidebar-preview-aside {
		width: 10%;
	}
	.lk-sidebar-preview--small .lk-sidebar-preview-body {
		left: 10%;
	}

	/* ── Content-width previews ── */
	.lk-content-preview {
		position: relative;
		display: block;
		height: 2.5rem;
		border-radius: 0.25rem;
		background: var(--color-bg-muted);
		overflow: hidden;
		padding: 0.25rem;
	}
	.lk-content-preview-body {
		position: absolute;
		background: var(--color-fg-muted);
		opacity: 0.6;
		border-radius: 2px;
		top: 0.25rem;
		bottom: 0.25rem;
	}
	.lk-content-preview--default .lk-content-preview-body {
		left: 20%;
		right: 20%;
	}
	.lk-content-preview--fluid .lk-content-preview-body {
		left: 0.25rem;
		right: 0.25rem;
	}

	/* ── Direction previews ── */
	.lk-dir-preview {
		position: relative;
		display: block;
		height: 2.5rem;
		border-radius: 0.25rem;
		background: var(--color-bg-muted);
		overflow: hidden;
	}
	.lk-dir-preview-aside {
		position: absolute;
		inset: 0 auto 0 0;
		width: 22%;
		background: var(--color-fg);
	}
	.lk-dir-preview-body {
		position: absolute;
		inset: 0 0 0 22%;
		background: var(--color-bg-elevated);
	}
	.lk-dir-preview--rtl .lk-dir-preview-aside {
		inset: 0 0 0 auto;
	}
	.lk-dir-preview--rtl .lk-dir-preview-body {
		inset: 0 22% 0 0;
	}

	/* ── Swatch buttons — colour pickers ── */
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
	.lk-swatch:hover {
		transform: scale(1.1);
	}
	.lk-swatch:focus-visible {
		outline: 2px solid var(--color-brand-500);
		outline-offset: 2px;
	}
	.lk-swatch--lg {
		inline-size: 2.25rem;
		block-size: 2.25rem;
		border-radius: 0.5rem;
	}
	.lk-swatch--selected {
		border-color: var(--color-fg);
		box-shadow: 0 0 0 2px var(--color-bg-elevated);
	}
</style>
