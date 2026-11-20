<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const brandMarkVariants = cva('inline-flex shrink-0 items-center gap-2 select-none', {
		variants: {
			size: {
				sm: '[&_img]:size-6 text-sm',
				md: '[&_img]:size-8 text-base',
				lg: '[&_img]:size-12 text-xl'
			}
		},
		defaultVariants: { size: 'md' }
	});
	export type BrandMarkVariants = VariantProps<typeof brandMarkVariants>;
</script>

<script lang="ts">
	/**
	 * The one brand mark: the app icon and, optionally, the word "LeadKart" in the surrounding text
	 * colour (so it follows the surface it sits on and the primary palette). `decorative` hides it
	 * from assistive technology when a neighbouring label already names it (a link with its own
	 * aria-label). The icon is a fixed-colour raster until a vector source of the logo exists (see
	 * CUSTOMIZATIONS.md); the wordmark is live text.
	 */
	import { _ } from 'svelte-i18n';
	import { cn } from '#lib/utils/cn.ts';

	type Props = BrandMarkVariants & {
		/** show the word next to the icon */
		wordmark?: boolean;
		decorative?: boolean;
		class?: string;
	};

	let { size = 'md', wordmark = false, decorative = false, class: className }: Props = $props();
	const name = $derived($_('common.brandName'));
</script>

<span class={cn(brandMarkVariants({ size }), className)} data-brand-mark>
	<img
		src="/images/favicon/favicon_128x128.png"
		alt={decorative || wordmark ? '' : name}
		class="rounded-md object-contain"
		width="128"
		height="128"
	/>
	{#if wordmark}
		<span class="font-semibold tracking-tight" aria-hidden={decorative ? 'true' : undefined}
			>{name}</span
		>
	{/if}
</span>
