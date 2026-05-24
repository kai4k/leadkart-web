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

	export type ToastAction = {
		label: string;
		onClick: () => void | Promise<void>;
	};

	type Toast = {
		id: string;
		variant: ToastVariant;
		message: string;
		action?: ToastAction;
		duration: number;
	};

	export const toastVariants = cva('border-s-4', {
		variants: {
			variant: {
				success: 'border-success-500',
				danger: 'border-danger-500',
				warning: 'border-warning-500',
				info: 'border-info-500'
			}
		},
		defaultVariants: { variant: 'info' }
	});

	export type ToastVariants = VariantProps<typeof toastVariants>;

	const toasts = $state<Toast[]>([]);

	/**
	 * Dismiss a toast by ID. Safe to call multiple times.
	 */
	export function dismiss(id: string): void {
		const idx = toasts.findIndex((t) => t.id === id);
		if (idx >= 0) toasts.splice(idx, 1);
	}

	/**
	 * Enqueues a toast notification.
	 * No-op during SSR (`browser` guard).
	 *
	 * @param variant  - visual variant
	 * @param message  - toast body text
	 * @param opts.action  - optional action button (label + onClick)
	 * @param opts.duration - auto-dismiss ms; default 5000 (10 000 recommended for undo)
	 *
	 * Usage:
	 *   import { toast } from '$ui';
	 *   toast('success', 'Tenant suspended');
	 *   toast('success', 'Member deactivated', {
	 *     action: { label: 'Undo', onClick: () => reactivate(id) },
	 *     duration: 10_000
	 *   });
	 */
	export function toast(
		variant: ToastVariant,
		message: string,
		opts?: { action?: ToastAction; duration?: number }
	): void {
		if (!browser) return;
		const id = crypto.randomUUID();
		const duration = opts?.duration ?? 5000;
		toasts.push({ id, variant, message, action: opts?.action, duration });
		setTimeout(() => dismiss(id), duration);
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
</script>

<div
	class="pointer-events-none fixed end-4 bottom-4 z-[var(--z-toast)] flex flex-col gap-2"
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
			<div class="flex items-start justify-between gap-3">
				<p class="label text-fg">{t.message}</p>
				{#if t.action}
					{@const action = t.action}
					<button
						type="button"
						class="label-small text-primary focus-visible:ring-focus-ring flex-shrink-0 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
						onclick={async () => {
							await action.onClick();
							dismiss(t.id);
						}}
					>
						{action.label}
					</button>
				{/if}
			</div>
		</div>
	{/each}
</div>
