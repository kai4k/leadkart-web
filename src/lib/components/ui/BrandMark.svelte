<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const brandMarkVariants = cva('inline-flex shrink-0 items-center gap-2 select-none', {
		variants: {
			/** where the mark sits: the sidebar has its own logo tokens (its dark / brand / sky colours are dark in either mode) */
			tone: {
				surface: '[--mark-frame:var(--brand-frame)] [--mark-capsule:var(--brand-capsule)]',
				sidebar:
					'[--mark-frame:var(--sidebar-brand-frame)] [--mark-capsule:var(--sidebar-brand-capsule)]'
			}
		},
		defaultVariants: { tone: 'surface' }
	});
	export type BrandMarkVariants = VariantProps<typeof brandMarkVariants>;

	const MARK_SIZE = { sm: 'size-6', md: 'size-8', lg: 'size-12' } as const;
	export type BrandMarkSize = keyof typeof MARK_SIZE;
	const WORDMARK_SIZE = { sm: 'h-4', md: 'h-5', lg: 'h-7' } as const;
</script>

<script lang="ts">
	/**
	 * The one brand mark: the approved LeadKart logo ("the L is the cart, the capsule is the lead"),
	 * drawn inline from the logo pack's geometry (svg/mark-colour.svg, unchanged: the frame path, the
	 * capsule path and two wheels under translate(-24 -14), round caps and joins, strokes 68 / 84,
	 * wheels r 34). No raster, no image.
	 *
	 * The colours are tokens, so the mark follows the chosen primary palette: the frame and wheels
	 * paint --brand-frame, the capsule --brand-capsule (the sidebar has its own pair: tone="sidebar").
	 * `mono` paints both in the surrounding text colour (currentColor).
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
		wordmark = false,
		decorative = false,
		mono = false,
		class: className
	}: Props = $props();
	const name = $derived($_('common.brandName'));
	// beside the wordmark the mark is part of one unit that the wordmark (or the link) names
	const hidden = $derived(decorative || wordmark);
	const frame = $derived(mono ? 'stroke-current' : 'stroke-(--mark-frame)');
	const wheel = $derived(mono ? 'fill-current' : 'fill-(--mark-frame)');
	const capsule = $derived(mono ? 'stroke-current' : 'stroke-(--mark-capsule)');
</script>

<!-- dir="ltr": the lockup (mark, then wordmark) is a logotype and never mirrors in a right-to-left page -->
<span class={cn(brandMarkVariants({ tone }), className)} data-brand-mark dir="ltr">
	<svg
		viewBox="0 0 512 512"
		class={cn('shrink-0', MARK_SIZE[size])}
		role={hidden ? undefined : 'img'}
		aria-label={hidden ? undefined : name}
		aria-hidden={hidden ? 'true' : undefined}
		focusable="false"
	>
		<g transform="translate(-24 -14)" fill="none" stroke-linecap="round" stroke-linejoin="round">
			<path d="M150 108V316a32 32 0 0 0 32 32H410" stroke-width="68" class={frame} />
			<path d="M272 248L384 136" stroke-width="84" class={capsule} />
			<circle cx="204" cy="432" r="34" class={wheel} />
			<circle cx="366" cy="432" r="34" class={wheel} />
		</g>
	</svg>
	{#if wordmark}
		<BrandWordmark {decorative} class={WORDMARK_SIZE[size]} />
	{/if}
</span>
