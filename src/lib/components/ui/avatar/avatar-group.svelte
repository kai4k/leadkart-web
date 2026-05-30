<script lang="ts" module>
	/**
	 * AvatarGroup — overlapping avatar stack with overflow indicator.
	 *
	 * Industry refs: Linear member list, GitHub reviewer chips, Figma
	 * presence stack. Members render LTR with a 40%-width overlap;
	 * overflow beyond `max` collapses into a "+N" chip in the same
	 * shape.
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const avatarGroupItemVariants = tv({
		base: [
			'inline-flex items-center justify-center rounded-full font-medium uppercase',
			'ring-2 ring-bg-elevated',
			'bg-[linear-gradient(135deg,var(--color-primary-soft),var(--color-bg-muted))]',
			'text-primary'
		],
		variants: {
			size: {
				xs: 'inline-size-5 block-size-5 text-[var(--text-2xs)]',
				sm: 'inline-size-7 block-size-7 text-[var(--text-2xs)]',
				md: 'inline-size-9 block-size-9 text-xs',
				lg: 'inline-size-12 block-size-12 text-sm'
			}
		},
		defaultVariants: { size: 'sm' }
	});

	export type AvatarGroupSize = NonNullable<VariantProps<typeof avatarGroupItemVariants>['size']>;
	export type AvatarGroupMember = {
		name: string;
		image?: string;
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		members: AvatarGroupMember[];
		max?: number;
		size?: AvatarGroupSize;
	};

	let {
		ref = $bindable(null),
		members,
		max = 3,
		size = 'sm',
		class: className = '',
		...rest
	}: Props = $props();

	const visible = $derived(members.slice(0, max));
	const overflow = $derived(Math.max(0, members.length - max));

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		const first = parts[0];
		if (!first) return '?';
		if (parts.length === 1) return first.slice(0, 2).toUpperCase();
		const last = parts[parts.length - 1] ?? first;
		return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
	}
</script>

<div
	bind:this={ref}
	data-slot="avatar-group"
	class={cn('inline-flex items-center', className)}
	role="group"
	aria-label="Members"
	{...rest}
>
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
