<script lang="ts">
	import { X, RotateCcw, Icon } from '$icons';
	import { Drawer } from '$ui';
	import {
		theme,
		PRIMARY_COLORS,
		CONTENT_WIDTHS,
		type PrimaryColor,
		type ContentWidth
	} from '$lib/hooks/use-theme.svelte';

	/**
	 * SettingsModal — right-side drawer. Two legitimate axes that real
	 * SaaS products expose to end users: brand colour and content
	 * width (boxed / fluid). The chrome shape (semibox) is fixed; the
	 * previous default-layout / dark-sidebar / RTL toggles were
	 * removed 2026-05-17 as theme-marketplace cruft.
	 *
	 * Composes the canonical `<Drawer.Root>` primitive (bits-ui Dialog)
	 * — focus trap, ESC, scroll lock, ARIA modal semantics and portal
	 * mounting come from the primitive; this file owns only content.
	 */

	let {
		open = $bindable(false),
		onOpenChange
	}: { open?: boolean; onOpenChange?: (open: boolean) => void } = $props();
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content class="max-w-sm">
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4 text-fg">Appearance</h2>
				<p class="caption text-fg-muted">Brand colour and content width</p>
			</div>
			<Drawer.Close class="hover:bg-bg-muted rounded-md p-1.5">
				<Icon icon={X} size="md" />
				<span class="sr-only">Close</span>
			</Drawer.Close>
		</Drawer.Header>

		<Drawer.Body>
			<div class="stack stack-relaxed">
				<!-- ── Primary colour ── -->
				<section class="stack stack-tight">
					<h3 class="h6">Brand colour</h3>
					<p class="caption text-fg-muted">Re-skins primary surfaces across the app.</p>
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
		</Drawer.Body>

		<Drawer.Footer>
			<button
				type="button"
				class={[
					'label border-border inline-flex items-center gap-2 rounded-md border px-4 py-2',
					'text-fg hover:bg-bg-muted transition-colors',
					'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
					'focus-visible:ring-focus-ring'
				]}
				onclick={() => theme.reset()}
			>
				<Icon icon={RotateCcw} size="sm" />
				Reset to defaults
			</button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>

<style>
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
