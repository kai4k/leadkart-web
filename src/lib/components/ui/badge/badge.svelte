<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	import type { HTMLAnchorAttributes, HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';

	/**
	 * shadcn-svelte `badge` (nova) with LeadKart edits: `cva`, no alpha, and the soft status
	 * variants (`StatusVariant` in utils/status.ts): `neutral | info | success | warning | danger |
	 * brand`, plus the counts `count` (neutral) and `count-urgent` (danger). Each pair is checked by
	 * the token contrast gate.
	 */
	/** what the two counts share; they differ only in fill and ink */
	const COUNT =
		'h-5 min-w-5 justify-center rounded-full border-(--solid-edge) px-1.5 py-0 font-bold tabular-nums shadow-(--shadow-clay-sm)';

	export const badgeVariants = cva(
		[
			'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs leading-tight font-medium whitespace-nowrap',
			'focus-visible:ring-2 focus-visible:ring-ring [&>svg]:pointer-events-none [&>svg]:size-3'
		],
		{
			variants: {
				variant: {
					default: 'bg-primary text-primary-foreground [a&]:hover:bg-primary-hover',
					secondary: 'bg-secondary text-secondary-foreground',
					destructive: 'bg-destructive text-destructive-foreground [a&]:hover:bg-destructive-hover',
					outline: 'border-border text-foreground [a&]:hover:bg-muted',
					neutral: 'bg-muted text-muted-foreground',
					info: 'bg-info-soft text-info',
					success: 'bg-success-soft text-success',
					warning: 'bg-warning-soft text-warning',
					danger: 'bg-destructive-soft text-destructive',
					brand: 'bg-primary-soft text-primary-text',
					// a count on a pebble or tab: neutral, never a status colour; red (`count-urgent`) means overdue/at-risk only
					count: [COUNT, 'bg-badge-count text-badge-count-foreground'],
					'count-urgent': [COUNT, 'bg-destructive text-destructive-foreground']
				},
				// `sm` is the compact badge of dense lists, status columns and card corners: tighter
				// inline padding, same 12px type (nothing a person reads is under 12px).
				size: {
					default: '',
					sm: 'px-1.5'
				}
			},
			defaultVariants: { variant: 'neutral', size: 'default' }
		}
	);

	export type BadgeVariants = VariantProps<typeof badgeVariants>;
	export type BadgeVariant = NonNullable<BadgeVariants['variant']>;
	export type BadgeSize = NonNullable<BadgeVariants['size']>;
	export type BadgeProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> &
		WithElementRef<HTMLAnchorAttributes> &
		BadgeVariants & {
			/** the name of a count ("12 unread", "3 overdue"): the number alone says nothing to a screen reader; an urgent count's wording carries the urgency */
			label?: string;
		};
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Icon, TriangleAlert } from '#lib/icons/index.ts';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'neutral',
		size = 'default',
		label,
		children,
		...restProps
	}: BadgeProps = $props();
	const isCount = $derived(variant === 'count' || variant === 'count-urgent');
	const urgent = $derived(variant === 'count-urgent');
	// an urgent count always says so in words, even when the caller's label does not
	const name = $derived(urgent && !label ? $_('common.urgent') : label);
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant, size }), className)}
	{...restProps}
>
	{#if isCount}
		<!-- urgency is a glyph and a word, not only the red fill -->
		{#if urgent}<Icon icon={TriangleAlert} size="xs" />{/if}
		<span aria-hidden={name ? 'true' : undefined}>{@render children?.()}</span>
		{#if name}<span class="sr-only">{name}</span>{/if}
	{:else}
		{@render children?.()}
	{/if}
</svelte:element>
