<script lang="ts" module>
	/**
	 * SINGLETON EXCEPTION: This module uses module-level `$state`, which
	 * CLAUDE.md rule 4 normally bans (it silently breaks cross-module
	 * reactivity). Toaster is a deliberate exception:
	 *
	 *   - Exactly ONE <Toaster /> is mounted in (app)/+layout.svelte.
	 *   - `toast()` is the sole writer, `<Toaster>` is the sole reader.
	 *   - Module-level `$state` is correct for a singleton sink — there
	 *     is no cross-module reactivity concern because nothing else
	 *     derives from or subscribes to `toasts` outside this file.
	 *
	 * Class-based stores are correct for multi-instance or cross-module
	 * reactive state. Singleton UI sinks (like this toaster) are the
	 * canonical exception pattern (used by shadcn-svelte, Melt UI, etc).
	 */
	import { browser } from '$app/environment';
	import { cva, type VariantProps } from 'class-variance-authority';

	export type ToastVariant = 'success' | 'danger' | 'warning' | 'info';
	type Toast = { id: string; variant: ToastVariant; message: string };

	export const toastVariants = cva('border-l-4', {
		variants: {
			variant: {
				success: 'border-[var(--color-success-500)]',
				danger: 'border-[var(--color-danger-500)]',
				warning: 'border-[var(--color-warning-500)]',
				info: 'border-[var(--color-info-500)]'
			}
		},
		defaultVariants: { variant: 'info' }
	});

	export type ToastVariants = VariantProps<typeof toastVariants>;

	const toasts = $state<Toast[]>([]);

	/**
	 * Enqueues a toast notification. Auto-dismissed after 5 s.
	 * No-op during SSR (`browser` guard).
	 *
	 * Usage:
	 *   import { toast } from '$ui';
	 *   toast('success', 'Tenant suspended');
	 *   toast('danger', 'Failed to load tenants');
	 */
	export function toast(variant: ToastVariant, message: string): void {
		if (!browser) return;
		const id = crypto.randomUUID();
		toasts.push({ id, variant, message });
		setTimeout(() => {
			const idx = toasts.findIndex((t) => t.id === id);
			if (idx >= 0) toasts.splice(idx, 1);
		}, 5000);
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
</script>

<div
	class="pointer-events-none fixed right-4 bottom-4 z-[var(--z-toast)] flex flex-col gap-2"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toasts as t (t.id)}
		<div
			class={cn(
				'glass-card animate-slide-in-right pointer-events-auto max-w-sm px-4 py-3',
				toastVariants({ variant: t.variant })
			)}
			role="status"
		>
			<p class="label text-[var(--color-fg)]">{t.message}</p>
		</div>
	{/each}
</div>
