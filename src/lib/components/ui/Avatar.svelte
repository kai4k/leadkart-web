<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const avatarVariants = cva(
		[
			'inline-flex items-center justify-center rounded-full font-medium uppercase',
			'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
			'text-[var(--color-primary)]'
		],
		{
			variants: {
				size: {
					sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
					md: 'inline-size-10 block-size-10 text-sm',
					lg: 'inline-size-14 block-size-14 text-base'
				}
			},
			defaultVariants: {
				size: 'md'
			}
		}
	);

	export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>['size']>;
	export type AvatarVariants = VariantProps<typeof avatarVariants>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	type Props = {
		initials: string;
		size?: AvatarSize;
		class?: string;
	};

	let { initials, size = 'md', class: className = '' }: Props = $props();
</script>

<span class={cn(avatarVariants({ size }), className)} aria-hidden="true">
	{initials}
</span>
