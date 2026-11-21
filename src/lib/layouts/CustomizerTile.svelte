<script lang="ts">
	/**
	 * One option of the customizer: a radio tile with a preview and its visible label. A `wireframe`
	 * preview is a miniature built from the colour tokens and picked by `data-preview="{group}-{value}"`
	 * (pure CSS, no inline style); a `swatch` is a dot picked by `data-swatch="{group}-{value}"`.
	 * Colours come only from tokens, so the previews follow the page's own mode and primary, except
	 * the mode and swatch tiles, which paint what each option looks like whatever is selected
	 * (`--palette-*`, `--neutral-*`, `--swatch-*`; the one place components read those).
	 */
	import * as RadioGroup from '#lib/components/ui/radio-group/index.ts';
	import type { PreferenceKey } from '$features/preferences';
	import type { TileKind } from './customizer-config.ts';

	let {
		group,
		value,
		label,
		kind,
		disabled = false
	}: {
		group: PreferenceKey;
		value: string;
		label: string;
		kind: TileKind;
		/** not available at this width: skipped by the roving focus, shown dimmed */
		disabled?: boolean;
	} = $props();

	const id = $derived(`${group}-${value}`);
</script>

<RadioGroup.Tile {value} {disabled}>
	{#if kind === 'wireframe'}
		<span
			class="cz-preview border-border group-aria-checked/tile:border-primary-indicator group-aria-checked/tile:ring-primary-indicator group-aria-checked/tile:ring-offset-popover block h-28 w-full overflow-hidden rounded-lg border group-aria-checked/tile:ring-2 group-aria-checked/tile:ring-offset-2"
			data-preview={id}
			aria-hidden="true"
		>
			<span class="cz-dots">
				<i></i><i></i><i></i>
			</span>
			<span class="cz-frame">
				<span class="cz-top"></span>
				<span class="cz-nav"></span>
				<span class="cz-side"><i></i><i></i><i></i></span>
				<span class="cz-body">
					<i></i><i></i><i></i><i></i><b></b>
				</span>
			</span>
		</span>
	{:else}
		<span
			class="cz-swatch border-border group-aria-checked/tile:ring-primary-indicator group-aria-checked/tile:ring-offset-popover mx-auto block size-10 rounded-full border group-aria-checked/tile:ring-2 group-aria-checked/tile:ring-offset-2"
			data-swatch={id}
			aria-hidden="true"
		></span>
	{/if}
	<span
		class="text-foreground group-aria-checked/tile:text-primary-text text-center text-sm font-medium"
	>
		{label}
	</span>
</RadioGroup.Tile>

<style>
	/* ── wireframe previews ─────────────────────────────────────────────────────── */
	.cz-preview {
		--cz-page: var(--muted);
		--cz-pane: var(--card);
		--cz-line: var(--border);
		--cz-side-w: 1.5fr;
		--cz-gap: 0rem;
		--cz-pad: 0rem;
		display: grid;
		grid-template-rows: auto 1fr;
		background: var(--cz-page);
	}
	.cz-dots {
		display: flex;
		gap: var(--spacing-1);
		padding: var(--spacing-1_5) var(--spacing-2);
		background: var(--cz-pane);
		border-block-end: var(--border-thin) solid var(--cz-line);
	}
	.cz-dots i {
		inline-size: var(--spacing-1_5);
		block-size: var(--spacing-1_5);
		border-radius: 9999px;
		background: var(--destructive-indicator);
	}
	.cz-dots i:nth-child(2) {
		background: var(--success-indicator);
	}
	.cz-dots i:nth-child(3) {
		background: var(--warning-indicator);
	}

	.cz-frame {
		display: grid;
		grid-template-columns: var(--cz-side-w) 6fr;
		grid-template-rows: auto 1fr;
		gap: var(--cz-gap);
		padding: var(--cz-pad);
		min-block-size: 0;
	}
	.cz-top {
		grid-column: 1 / -1;
		grid-row: 1;
		block-size: var(--spacing-3);
		background: var(--cz-pane);
		border-block-end: var(--border-thin) solid var(--cz-line);
	}
	.cz-nav {
		display: none;
	}
	.cz-side {
		grid-column: 1;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
		padding: var(--spacing-1);
		background: var(--sidebar);
		border-inline-end: var(--border-thin) solid var(--sidebar-border);
	}
	.cz-side i {
		display: block;
		block-size: var(--spacing-1);
		border-radius: var(--spacing-0_5);
		background: var(--sidebar-foreground);
	}
	.cz-body {
		grid-column: 2;
		grid-row: 2;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
		padding: var(--spacing-1_5);
		min-inline-size: 0;
	}
	.cz-body i {
		display: block;
		block-size: var(--spacing-1_5);
		border-radius: var(--spacing-0_5);
		background: var(--cz-pane);
		border: var(--border-thin) solid var(--cz-line);
	}
	.cz-body i:nth-child(1) {
		inline-size: 33%;
	}
	.cz-body i:nth-child(2) {
		inline-size: 50%;
	}
	.cz-body i:nth-child(3) {
		inline-size: 100%;
	}
	.cz-body i:nth-child(4) {
		inline-size: 66%;
	}
	.cz-body b {
		display: block;
		inline-size: 40%;
		block-size: var(--spacing-2);
		border-radius: var(--spacing-0_5);
		background: var(--primary);
	}

	/* layout */
	[data-preview='layout-modern'] .cz-top {
		grid-column: 2;
	}
	[data-preview='layout-modern'] .cz-side {
		grid-row: 1 / -1;
	}
	[data-preview='layout-horizontal'] .cz-frame {
		grid-template-columns: 1fr;
		grid-template-rows: auto auto 1fr;
	}
	[data-preview='layout-horizontal'] .cz-nav {
		display: block;
		grid-row: 2;
		block-size: var(--spacing-2);
		background: var(--cz-pane);
		border-block-end: var(--border-thin) solid var(--cz-line);
	}
	[data-preview='layout-horizontal'] .cz-side {
		display: none;
	}
	[data-preview='layout-horizontal'] .cz-body {
		grid-column: 1;
		grid-row: 3;
	}
	[data-preview='layout-boxed'] {
		--cz-pad: var(--spacing-2);
		--cz-page: var(--primary-500);
	}
	[data-preview='layout-boxed'] .cz-frame {
		background: var(--muted);
	}
	[data-preview='layout-semibox'] {
		--cz-gap: var(--spacing-1);
		--cz-pad: var(--spacing-1);
	}
	[data-preview='layout-semibox'] .cz-top,
	[data-preview='layout-semibox'] .cz-side,
	[data-preview='layout-semibox'] .cz-body {
		border: var(--border-thin) solid var(--cz-line);
		border-radius: var(--spacing-1);
	}
	[data-preview='layout-semibox'] .cz-side {
		border-color: var(--sidebar-border);
	}
	[data-preview='layout-semibox'] .cz-top {
		grid-column: 2;
	}
	[data-preview='layout-semibox'] .cz-side {
		grid-row: 1 / -1;
	}

	/* navigation style (the topbar's treatment) */
	[data-preview='navType-floating'] .cz-top {
		margin: var(--spacing-1);
		border: var(--border-thin) solid var(--cz-line);
		border-radius: var(--spacing-1);
		box-shadow: var(--shadow-sm);
	}
	[data-preview='navType-boxed'] .cz-top {
		margin: var(--spacing-1_5) var(--spacing-3);
		border: var(--border-thin) solid var(--cz-line);
		border-radius: var(--spacing-1);
	}
	[data-preview='navType-pattern'] .cz-top {
		background-color: var(--primary);
		background-image: radial-gradient(var(--primary-hover) 1px, transparent 1px);
		background-size: var(--spacing-1) var(--spacing-1);
		border-color: var(--primary);
	}

	/* content width (the body's reach) */
	[data-preview='contentWidth-default'] .cz-body {
		padding-inline: 18%;
	}
	[data-preview='contentWidth-fluid'] .cz-body {
		padding-inline: var(--spacing-1_5);
	}

	/* sidebar size */
	[data-preview='sidebar-large'] {
		--cz-side-w: 1.6fr;
	}
	[data-preview='sidebar-medium'] {
		--cz-side-w: 1.1fr;
	}
	[data-preview='sidebar-small'] {
		--cz-side-w: 0.45fr;
	}
	[data-preview='sidebar-small'] .cz-side i {
		inline-size: var(--spacing-1);
	}

	/* transparency: a striped page under the bar and the sidebar, which are drawn as flat colours at
	   a level of see-through (NOT a backdrop filter: eight tiles would be eight filtered layers) */
	[data-preview^='transparency-'] {
		--cz-page: repeating-linear-gradient(
			135deg,
			var(--muted) 0 var(--spacing-1),
			var(--primary-soft) var(--spacing-1) var(--spacing-2)
		);
	}
	[data-preview='transparency-glass'] .cz-top,
	[data-preview='transparency-glass'] .cz-side {
		opacity: 0.55;
	}
	[data-preview='transparency-reduced'] .cz-top,
	[data-preview='transparency-reduced'] .cz-side {
		opacity: 0.85;
	}

	/* mode: what the mode looks like, whatever mode the page is in */
	[data-preview='mode-light'],
	[data-preview='mode-black-white'] {
		--cz-page: var(--palette-gray-100);
		--cz-pane: var(--swatch-sidebar-light);
		--cz-line: var(--palette-gray-200);
	}
	[data-preview='mode-light'] .cz-side,
	[data-preview='mode-black-white'] .cz-side {
		background: var(--swatch-sidebar-light);
		border-color: var(--palette-gray-200);
	}
	[data-preview='mode-light'] .cz-side i,
	[data-preview='mode-black-white'] .cz-side i {
		background: var(--palette-gray-400);
	}
	[data-preview='mode-black-white'] {
		filter: grayscale(1);
	}
	[data-preview='mode-dark'] {
		--cz-page: var(--neutral-default-950);
		--cz-pane: var(--neutral-default-900);
		--cz-line: var(--neutral-default-800);
	}
	[data-preview='mode-dark'] .cz-side {
		background: var(--neutral-default-900);
		border-color: var(--neutral-default-800);
	}
	[data-preview='mode-dark'] .cz-side i {
		background: var(--neutral-default-600);
	}
	[data-preview='mode-auto'] {
		--cz-page: transparent;
		--cz-pane: transparent;
		--cz-line: transparent;
		background: linear-gradient(
			105deg,
			var(--palette-gray-100) 50%,
			var(--neutral-default-950) 50%
		);
	}
	[data-preview='mode-auto'] .cz-dots,
	[data-preview='mode-auto'] .cz-top,
	[data-preview='mode-auto'] .cz-side {
		background: transparent;
		border-color: transparent;
	}
	[data-preview='mode-auto'] .cz-side i,
	[data-preview='mode-auto'] .cz-body i {
		background: var(--palette-gray-400);
		border-color: transparent;
	}

	/* ── swatches ───────────────────────────────────────────────────────────────── */
	[data-swatch='colors-leadkart'] {
		background: var(--palette-leadkart-500);
	}
	[data-swatch='colors-green'] {
		background: var(--palette-green-500);
	}
	[data-swatch='colors-violet'] {
		background: var(--palette-violet-500);
	}
	[data-swatch='colors-orange'] {
		background: var(--palette-orange-500);
	}
	[data-swatch='colors-teal'] {
		background: var(--palette-teal-500);
	}
	[data-swatch='colors-fuchsia'] {
		background: var(--palette-fuchsia-500);
	}
	[data-swatch='colors-lime'] {
		background: var(--palette-lime-500);
	}
	[data-swatch='colors-amber'] {
		background: var(--palette-amber-500);
	}
	[data-swatch='darkPalette-default'] {
		background: var(--neutral-default-950);
	}
	[data-swatch='darkPalette-zinc'] {
		background: var(--neutral-zinc-950);
	}
	[data-swatch='darkPalette-stone'] {
		background: var(--neutral-stone-950);
	}
	[data-swatch='darkPalette-neutral'] {
		background: var(--neutral-neutral-950);
	}
	[data-swatch='darkPalette-gray'] {
		background: var(--neutral-gray-950);
	}
	[data-swatch='sidebarColors-light'] {
		background: var(--swatch-sidebar-light);
	}
	[data-swatch='sidebarColors-dark'] {
		background: var(--swatch-sidebar-dark);
	}
	[data-swatch='sidebarColors-brand'] {
		background: var(--primary-900);
	}
	[data-swatch='sidebarColors-purple'] {
		background: var(--swatch-sidebar-purple);
	}
	[data-swatch='sidebarColors-sky'] {
		background: var(--swatch-sidebar-sky);
	}
</style>
