<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const logoVariants = cva('shrink-0 select-none', {
		variants: {
			size: {
				xs: 'h-6 w-auto',
				sm: 'h-8 w-auto',
				md: 'h-10 w-auto',
				lg: 'h-14 w-auto',
				xl: 'h-20 w-auto'
			}
		},
		defaultVariants: { size: 'md' }
	});

	export type LogoVariants = VariantProps<typeof logoVariants>;
</script>

<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { cn } from '$lib/utils/cn';

	type Props = LogoVariants & {
		/**
		 * Force light or dark variant regardless of active theme.
		 * Useful for pinning the logo against a known background
		 * (e.g. white logo on the brand-coloured AuthShell panel
		 * regardless of OS dark-mode preference).
		 */
		variant?: 'auto' | 'light-bg' | 'dark-bg';
		class?: string;
		alt?: string;
	};

	let { size = 'md', variant = 'auto', class: className = '', alt = 'LeadKart' }: Props = $props();

	/**
	 * Pick the right asset:
	 *   light-bg → dark logo (LeadKart_Logo_Light_Theme.png — drawn for
	 *               light backgrounds, so the marks are dark).
	 *   dark-bg  → light logo (LeadKart_Logo_Dark_Theme.png — drawn for
	 *               dark backgrounds, so the marks are light).
	 *   auto     → follows the global theme rune.
	 */
	const src = $derived(
		variant === 'light-bg'
			? '/images/logo/LeadKart_Logo_Light_Theme.png'
			: variant === 'dark-bg'
				? '/images/logo/LeadKart_Logo_Dark_Theme.png'
				: theme.effective === 'dark'
					? '/images/logo/LeadKart_Logo_Dark_Theme.png'
					: '/images/logo/LeadKart_Logo_Light_Theme.png'
	);

	/**
	 * Retina srcset — browsers pick the right density. The 256px asset
	 * is the highest-res reasonable for in-app header use; 1024 is for
	 * marketing / hero placements.
	 */
	const srcset = $derived(
		theme.effective === 'dark' || variant === 'dark-bg'
			? '/images/logo/LeadKart_Logo_Dark_Theme.png 1x'
			: '/images/logo/LeadKart_Logo_Light_Theme.png 1x'
	);
</script>

<img
	{src}
	{srcset}
	{alt}
	class={cn(logoVariants({ size }), className)}
	loading="eager"
	decoding="async"
/>
