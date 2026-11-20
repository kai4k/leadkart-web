<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { AlertCircle, CheckCircle2, Icon, Info, XCircle } from '#lib/icons/index.ts';
	import { cn, type WithElementRef } from '#lib/utils/cn.ts';

	/**
	 * shadcn-svelte `alert` with LeadKart edits (ui/CUSTOMIZATIONS.md): soft token fills (no alpha),
	 * the status variants, a `title`, an icon per variant, `dismissible`, and a role that follows
	 * the severity: `alert` (assertive) for destructive and warning, `status` (polite) otherwise.
	 */
	export const alertVariants = cva('body-sm relative w-full rounded-md border p-4', {
		variants: {
			variant: {
				default: 'border-border bg-card text-card-foreground',
				info: 'border-border bg-info-soft text-info',
				success: 'border-border bg-success-soft text-success',
				warning: 'border-border bg-warning-soft text-warning',
				destructive: 'border-border bg-destructive-soft text-destructive'
			}
		},
		defaultVariants: { variant: 'info' }
	});
	export type AlertVariants = VariantProps<typeof alertVariants>;
	export type AlertVariant = NonNullable<AlertVariants['variant']>;

	export type AlertProps = WithElementRef<HTMLAttributes<HTMLDivElement>> &
		AlertVariants & {
			title?: string;
			dismissible?: boolean;
			onDismiss?: () => void;
			children?: Snippet;
		};
</script>

<script lang="ts">
	let {
		ref = $bindable(null),
		variant = 'info',
		title,
		dismissible = false,
		onDismiss,
		class: className,
		children,
		...rest
	}: AlertProps = $props();

	const role = $derived(variant === 'destructive' || variant === 'warning' ? 'alert' : 'status');
	const variantIcon = $derived(
		variant === 'success'
			? CheckCircle2
			: variant === 'warning'
				? AlertCircle
				: variant === 'destructive'
					? XCircle
					: Info
	);
</script>

<div
	bind:this={ref}
	data-slot="alert"
	{role}
	class={cn(alertVariants({ variant }), className)}
	{...rest}
>
	<div class="flex items-start gap-3">
		<Icon icon={variantIcon} size="md" class="mt-0.5 flex-shrink-0" />
		<div class="flex-1">
			{#if title}<p class="mb-1 font-semibold">{title}</p>{/if}
			{#if children}<div>{@render children()}</div>{/if}
		</div>
		{#if dismissible}
			<button
				type="button"
				class="hover:bg-muted focus-visible:ring-ring rounded-sm p-0.5 focus-visible:ring-2 focus-visible:outline-none"
				aria-label="Dismiss"
				onclick={() => onDismiss?.()}
			>
				<Icon icon={XCircle} size="sm" />
			</button>
		{/if}
	</div>
</div>
