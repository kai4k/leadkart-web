<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	export const avatarGroupItemVariants = cva(
		[
			'inline-flex items-center justify-center rounded-full font-medium uppercase',
			'ring-2 ring-card',
			'bg-[linear-gradient(135deg,var(--primary-soft),var(--muted))]',
			'text-primary-text'
		],
		{
			variants: {
				size: {
					xs: 'size-6 text-xs',
					sm: 'size-7 text-xs',
					md: 'size-9 text-xs',
					lg: 'size-12 text-sm'
				}
			},
			defaultVariants: { size: 'sm' }
		}
	);
	export type AvatarGroupSize = NonNullable<VariantProps<typeof avatarGroupItemVariants>['size']>;
	export type AvatarGroupMember = { name: string; image?: string };
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';
	import { initials } from '#lib/utils/person-name.ts';

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
</script>

<div
	bind:this={ref}
	data-slot="avatar-group"
	class={cn('inline-flex items-center', className)}
	role="group"
	aria-label={$_('common.members.label')}
	{...rest}
>
	{#each visible as member, i (`${member.name}-${i}`)}
		<span
			class={cn(avatarGroupItemVariants({ size }), i > 0 && '-ml-[40%]')}
			title={member.name}
			aria-label={member.name}
		>
			{#if member.image}
				<img src={member.image} alt="" class="size-full rounded-full object-cover" />
			{:else}
				{initials(member.name)}
			{/if}
		</span>
	{/each}
	{#if overflow > 0}
		<span
			class={cn(
				avatarGroupItemVariants({ size }),
				'bg-muted text-muted-foreground -ml-[40%] bg-none',
				'tabular-nums'
			)}
			aria-label={$_('common.members.more', { values: { count: overflow } })}
			title={$_('common.members.moreTitle', { values: { count: overflow } })}
		>
			+{overflow}
		</span>
	{/if}
</div>
