<script lang="ts" module>
	/**
	 * AvatarGroup — overlapping avatar stack with overflow indicator.
	 *
	 * Industry refs: Linear member list, GitHub reviewer chips, Figma
	 * presence stack. Members render LTR with a 60%-width overlap (each
	 * subsequent avatar nudged left). Overflow beyond `max` collapses
	 * into a "+N" chip in the same shape.
	 */

	import type { VariantProps } from 'class-variance-authority';
	import { cva } from 'class-variance-authority';

	export const avatarGroupItemVariants = cva(
		[
			'inline-flex items-center justify-center rounded-full font-medium uppercase',
			'ring-2 ring-bg-elevated',
			'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
			'text-primary'
		],
		{
			variants: {
				size: {
					xs: 'inline-size-5 block-size-5 text-[var(--text-2xs)]',
					sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
					md: 'inline-size-9 block-size-9 text-xs',
					lg: 'inline-size-12 block-size-12 text-sm'
				}
			},
			defaultVariants: { size: 'sm' }
		}
	);

	export type AvatarGroupSize = NonNullable<VariantProps<typeof avatarGroupItemVariants>['size']>;
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';

	export type AvatarGroupMember = {
		name: string;
		image?: string;
	};

	type Props = {
		members: AvatarGroupMember[];
		max?: number;
		size?: AvatarGroupSize;
		class?: string;
	};

	let { members, max = 3, size = 'sm', class: className = '' }: Props = $props();

	const visible = $derived(members.slice(0, max));
	const overflow = $derived(Math.max(0, members.length - max));

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
		return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
	}
</script>

<div class={cn('inline-flex items-center', className)} role="group" aria-label="Members">
	{#each visible as member, i (`${member.name}-${i}`)}
		<span
			class={cn(avatarGroupItemVariants({ size }), i > 0 && '-ml-[40%]')}
			title={member.name}
			aria-label={member.name}
		>
			{#if member.image}
				<img
					src={member.image}
					alt=""
					class="block-size-full inline-size-full rounded-full object-cover"
				/>
			{:else}
				{initials(member.name)}
			{/if}
		</span>
	{/each}
	{#if overflow > 0}
		<span
			class={cn(
				avatarGroupItemVariants({ size }),
				'bg-bg-muted text-fg-muted -ml-[40%] bg-none',
				'tabular-nums'
			)}
			aria-label={`+${overflow} more`}
			title={`+${overflow} more members`}
		>
			+{overflow}
		</span>
	{/if}
</div>
