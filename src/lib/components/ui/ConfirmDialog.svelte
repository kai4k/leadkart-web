<!-- src/lib/components/ui/ConfirmDialog.svelte -->
<script lang="ts" module>
	/**
	 * Semantic intent of the confirm. Drives icon + accent + the
	 * primary button variant. Material 3 + Apple HIG canon:
	 *
	 *   default — neutral confirm, primary button.
	 *   info    — informational pre-confirm (e.g. "send invitation?").
	 *   warning — reversible-but-significant op (quarantine, suspend).
	 *   danger  — destructive, irreversible (delete, revoke, void).
	 */
	export type ConfirmDialogVariant = 'default' | 'info' | 'warning' | 'danger';
</script>

<script lang="ts">
	import * as Dialog from './dialog/index.js';
	import { Button } from './button';
	import { Icon, AlertTriangle, Info, AlertCircle } from '$icons';
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: ConfirmDialogVariant;
		loading?: boolean;
		onConfirm: () => void | Promise<void>;
		onOpenChange?: (open: boolean) => void;
		body?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		variant = 'default',
		loading = false,
		onConfirm,
		onOpenChange,
		body
	}: Props = $props();

	async function onConfirmClick() {
		await onConfirm();
	}

	// Variant → leading icon + accent classes (tokens only — no inline colours).
	const VARIANT_CONFIG: Record<
		ConfirmDialogVariant,
		{ icon: Component | null; iconClass: string; bgClass: string }
	> = {
		default: { icon: null, iconClass: '', bgClass: '' },
		info: {
			icon: Info as unknown as Component,
			iconClass: 'text-info-700',
			bgClass: 'bg-info-50'
		},
		warning: {
			icon: AlertTriangle as unknown as Component,
			iconClass: 'text-warning-700',
			bgClass: 'bg-warning-50'
		},
		danger: {
			icon: AlertCircle as unknown as Component,
			iconClass: 'text-danger-700',
			bgClass: 'bg-danger-50'
		}
	};
	const vc = $derived(VARIANT_CONFIG[variant]);
	// Button variant mapping. Buttons.danger is the only "warm" variant we
	// own; warning + info defer to `primary` (Material 3 treats info as
	// neutral-emphasis, and a warning's emphasis lives in the icon + strip
	// rather than a yellow CTA which fails contrast targets).
	const buttonVariant = $derived(variant === 'danger' ? 'danger' : 'primary');
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="cluster cluster-tight items-start gap-3">
				{#if vc.icon}
					<span
						class={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', vc.bgClass)}
						aria-hidden="true"
					>
						<Icon icon={vc.icon} size="md" class={vc.iconClass} />
					</span>
				{/if}
				<div class="stack stack-tight">
					<h2 class="h5">{title}</h2>
					{#if description}<p class="body-sm text-fg-muted">{description}</p>{/if}
				</div>
			</div>
		</Dialog.Header>
		{#if body}
			<Dialog.Body>{@render body()}</Dialog.Body>
		{/if}
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={loading}>{cancelLabel}</Button>
			</Dialog.Close>
			<Button variant={buttonVariant} {loading} onclick={onConfirmClick}>
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
