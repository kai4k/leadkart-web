<script lang="ts" module>
	import { cva, type VariantProps } from 'class-variance-authority';

	export const alertVariants = cva(['rounded-md border p-4 body-sm'], {
		variants: {
			variant: {
				info: 'bg-[var(--color-info-50)] border-[var(--color-info-100)] text-[var(--color-info-900)] dark:bg-[var(--color-info-900)] dark:border-[var(--color-info-700)] dark:text-[var(--color-info-50)]',
				success:
					'bg-[var(--color-success-50)] border-[var(--color-success-100)] text-[var(--color-success-900)] dark:bg-[var(--color-success-900)] dark:border-[var(--color-success-700)] dark:text-[var(--color-success-50)]',
				warning:
					'bg-[var(--color-warning-50)] border-[var(--color-warning-100)] text-[var(--color-warning-900)] dark:bg-[var(--color-warning-900)] dark:border-[var(--color-warning-700)] dark:text-[var(--color-warning-50)]',
				danger:
					'bg-[var(--color-danger-50)] border-[var(--color-danger-100)] text-[var(--color-danger-900)] dark:bg-[var(--color-danger-900)] dark:border-[var(--color-danger-700)] dark:text-[var(--color-danger-50)]'
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
				class="rounded-sm p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
				aria-label="Dismiss"
				onclick={() => onDismiss?.()}
			>
				<XCircle size={16} aria-hidden="true" />
			</button>
		{/if}
	</div>
</div>
