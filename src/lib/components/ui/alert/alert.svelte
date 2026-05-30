<script lang="ts" module>
	/**
	 * Alert — shadcn-svelte canonical structure with the LeadKart
	 * 4-variant set (info / success / warning / danger). Auto-icon per
	 * variant; optional title slot; dismiss button + onDismiss callback.
	 */
	import { type VariantProps, tv } from 'tailwind-variants';

	export const alertVariants = tv({
		base: 'body-sm rounded-md border p-4 backdrop-blur-md',
		variants: {
			variant: {
				info: 'bg-info-50/85 border-info-100 text-info-900',
				success: 'bg-success-50/85 border-success-100 text-success-900',
				warning: 'bg-warning-50/85 border-warning-100 text-warning-900',
				danger: 'bg-danger-50/85 border-danger-100 text-danger-900'
			}
		},
		defaultVariants: { variant: 'info' }
	});

	export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;
	export type AlertVariants = VariantProps<typeof alertVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { AlertCircle, CheckCircle2, Icon, Info, XCircle } from '$lib/icons';
	import { cn, type WithElementRef } from '$lib/utils/cn';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> &
		AlertVariants & {
			title?: string;
			dismissible?: boolean;
			onDismiss?: () => void;
			children?: Snippet;
		};

	let {
		ref = $bindable(null),
		variant = 'info',
		title,
		dismissible = false,
		onDismiss,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const variantIcon = $derived(
		variant === 'success'
			? CheckCircle2
			: variant === 'warning'
				? AlertCircle
				: variant === 'danger'
					? XCircle
					: Info
	);
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	aria-live="polite"
	class={cn(alertVariants({ variant }), className)}
	{...rest}
>
	<div class="flex items-start gap-3">
		<Icon icon={variantIcon} size="md" class="mt-0.5 flex-shrink-0" />
		<div class="flex-1">
			{#if title}
				<p class="mb-1 font-semibold">{title}</p>
			{/if}
			{#if children}
				<div>{@render children()}</div>
			{/if}
		</div>
		{#if dismissible}
			<button
				type="button"
				class="hover:bg-bg-muted rounded-sm p-0.5"
				aria-label="Dismiss"
				onclick={() => onDismiss?.()}
			>
				<Icon icon={XCircle} size="sm" />
			</button>
		{/if}
	</div>
</div>
