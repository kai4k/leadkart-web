<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const avatarVariants = cva(
		[
			'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium uppercase',
			'',
			'bg-[linear-gradient(135deg,var(--primary-soft),var(--muted))]',
			'text-primary-text',
			'ring-1 ring-card'
		],
		{
			variants: {
				size: {
					sm: 'size-7 text-[var(--text-2xs)]',
					md: 'size-10 text-sm',
					lg: 'size-14 text-base'
				}
			},
			defaultVariants: { size: 'md' }
		}
	);
	export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
	export type AvatarVariants = VariantProps<typeof avatarVariants>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';

	type Props = WithElementRef<HTMLAttributes<HTMLSpanElement>> &
		AvatarVariants & { initials: string };
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
	{...rest}>{initials}</span
>
