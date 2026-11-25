<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	import geometry from './brand-mark-geometry.json';

	export const brandMarkVariants = cva('inline-flex shrink-0 items-center gap-2 select-none', {
		variants: {
			/** where the mark sits: the sidebar has its own logo tokens (dark in either mode); a pebble paints the L light and the K a light tint of its second piece */
			tone: {
				// --brand-frame is the palette's --primary and --brand-capsule its --brand-2 (semantic.css), re-declared by the
				// material bar and the pattern band, so the gated logo pairs cover the mark as drawn
				surface: '[--m1:var(--brand-frame)] [--m2:var(--brand-capsule)]',
				sidebar: '[--m1:var(--sidebar-brand-frame)] [--m2:var(--sidebar-brand-capsule)]',
				pebble: '[--m1:var(--app-glyph)] [--m2:var(--brand-pebble-capsule)]'
			}
		},
		defaultVariants: { tone: 'surface' }
	});
	export type BrandMarkVariants = VariantProps<typeof brandMarkVariants>;

	// rendered edge: sm 24 px, md 32 px, lg 48 px
	const MARK_SIZE = { sm: 'size-6', md: 'size-8', lg: 'size-12' } as const;
	export type BrandMarkSize = keyof typeof MARK_SIZE;
	export type BrandMarkDrawing = keyof typeof geometry;
	/** the small drawing (a 16-unit grid, straight edges on whole units) is for 32 px and under, the full one above */
	const DRAWING_BY_SIZE: Record<BrandMarkSize, BrandMarkDrawing> = {
		sm: 'small',
		md: 'small',
		lg: 'full'
	};
	const WORDMARK_SIZE = { sm: 'h-4', md: 'h-5', lg: 'h-7' } as const;
</script>

<script lang="ts">
	/**
	 * The one brand mark: the LK monogram "Two Cuts" (monogram 6 of the logo study): one soft tile cut
	 * twice, the big piece is the L, the piece packed into its corner is the K. Drawn inline from
	 * `brand-mark-geometry.json` (the same path data the icon generator reads): two filled paths, no
	 * stroke, no raster. Two drawings of the one idea: `full` (a 64-unit square, 40 px and up) and
	 * `small` (a 16-unit grid, 32 px and under); the size picks one, `drawing` overrides it.
	 *
	 * The colours are tokens, so the mark follows the chosen palette: the L fills `--m1` (the
	 * palette's `--primary`), the K fills `--m2` (`--brand-2`). The sidebar has its own pair
	 * (tone="sidebar"), a pebble its own (tone="pebble"). `mono` paints both in the surrounding text
	 * colour (currentColor).
	 *
	 * `decorative` hides it from assistive technology (a neighbouring label already names the brand,
	 * or a link has its own aria-label); otherwise it is an image named "LeadKart". `wordmark` adds
	 * the outlined wordmark beside it: the pair is one unit, named by the wordmark.
	 */
	import { _ } from 'svelte-i18n';
	import { cn } from '#lib/utils/cn.ts';
	import BrandWordmark from './BrandWordmark.svelte';

	type Props = BrandMarkVariants & {
		size?: BrandMarkSize;
		/** which drawing; default by `size` (small up to 32 px) */
		drawing?: BrandMarkDrawing;
		/** show the wordmark next to the mark */
		wordmark?: boolean;
		decorative?: boolean;
		/** one colour: the surrounding text colour */
		mono?: boolean;
		class?: string;
	};

	let {
		size = 'md',
		tone = 'surface',
		drawing,
		wordmark = false,
		decorative = false,
		mono = false,
		class: className
	}: Props = $props();
	const name = $derived($_('common.brandName'));
	// beside the wordmark the mark is part of one unit that the wordmark (or the link) names
	const hidden = $derived(decorative || wordmark);
	const shape = $derived(geometry[drawing ?? DRAWING_BY_SIZE[size]]);
	const l = $derived(mono ? 'fill-current' : 'fill-(--m1)');
	const k = $derived(mono ? 'fill-current' : 'fill-(--m2)');
</script>

<!-- dir="ltr": the lockup (mark, then wordmark) is a logotype and never mirrors in a right-to-left page -->
<span class={cn(brandMarkVariants({ tone }), className)} data-brand-mark dir="ltr">
	<svg
		viewBox={shape.box}
		class={cn('shrink-0', MARK_SIZE[size])}
		role={hidden ? undefined : 'img'}
		aria-label={hidden ? undefined : name}
		aria-hidden={hidden ? 'true' : undefined}
		focusable="false"
	>
		<path d={shape.l} class={l} />
		<path d={shape.k} class={k} />
	</svg>
	{#if wordmark}
		<BrandWordmark {decorative} class={WORDMARK_SIZE[size]} />
	{/if}
</span>
