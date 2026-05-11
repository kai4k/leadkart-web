<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const logoVariants = cva('shrink-0 select-none', {
		variants: {
			size: {
				xs: 'h-6 w-auto',
				sm: 'h-8 w-auto',
				md: 'h-10 w-auto',
				lg: 'h-14 w-auto',
				xl: 'h-20 w-auto',
				'2xl': 'h-28 w-auto'
			}
		},
		defaultVariants: { size: 'md' }
	});

	export type LogoVariants = VariantProps<typeof logoVariants>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = LogoVariants & {
		class?: string;
		alt?: string;
	};

	let { size = 'md', class: className = '', alt = 'LeadKart' }: Props = $props();

	// App is light-only as of 2026-05-12. The dark-theme PNG is retained
	// on disk in case dark mode is reintroduced, but is not selected here.
	const src = '/images/logo/LeadKart_Logo_Light_Theme.png';
</script>

<img {src} {alt} class={cn(logoVariants({ size }), className)} loading="eager" decoding="async" />
