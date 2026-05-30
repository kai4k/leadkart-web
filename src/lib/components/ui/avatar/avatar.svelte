<script lang="ts" module>
	/**
	 * Avatar — initials chip with size variants. Lifted from legacy
	 * Avatar.svelte into shadcn-canon directory layout. Single component
	 * (no compound Root/Image/Fallback split) — matches LeadKart usage.
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const avatarVariants = tv({
		base: [
			'inline-flex items-center justify-center rounded-full font-medium uppercase',
			'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
			'text-primary'
		],
		variants: {
			size: {
				sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
				md: 'inline-size-10 block-size-10 text-sm',
				lg: 'inline-size-14 block-size-14 text-base'
			}
		},
		defaultVariants: { size: 'md' }
	});

	export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
	export type AvatarVariants = VariantProps<typeof avatarVariants>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>> &
		AvatarVariants & {
			initials: string;
		};

	let {
		ref = $bindable(null),
		initials,
		size = 'md',
		class: className = '',
		...rest
	}: Props = $props();
</script>

<span
	bind:this={ref}
	data-slot="avatar"
	class={cn(avatarVariants({ size }), className)}
	aria-hidden="true"
	{...rest}
>
	{initials}
</span>
