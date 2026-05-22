<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const alertVariants = cva(['rounded-md border p-4 body-sm'], {
		variants: {
			variant: {
				info: 'bg-info-50 border-info-100 text-info-900',
				success: 'bg-success-50 border-success-100 text-success-900',
				warning: 'bg-warning-50 border-warning-100 text-warning-900',
				danger: 'bg-danger-50 border-danger-100 text-danger-900'
			}
		},
		defaultVariants: { variant: 'info' }
	});

	export type AlertVariants = VariantProps<typeof alertVariants>;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils/cn';

	type Props = AlertVariants & {
		title?: string;
		dismissible?: boolean;
		onDismiss?: () => void;
		class?: string;
		children?: Snippet;
	};

	let {
		variant = 'info',
		title,
		dismissible = false,
		onDismiss,
		class: className = '',
		children
	}: Props = $props();

	const Icon = $derived(
		variant === 'success'
			? CheckCircle2
			: variant === 'warning'
				? AlertCircle
				: variant === 'danger'
					? XCircle
					: Info
	);
</script>

<div class={cn(alertVariants({ variant }), className)} role="alert" aria-live="polite">
	<div class="flex items-start gap-3">
		<Icon size={18} class="mt-0.5 flex-shrink-0" aria-hidden="true" />
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
				<XCircle size={16} aria-hidden="true" />
			</button>
		{/if}
	</div>
</div>
