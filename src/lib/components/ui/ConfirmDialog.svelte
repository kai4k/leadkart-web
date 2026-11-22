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
	import * as AlertDialog from './alert-dialog/index.js';
	import { Button } from './button';
	import { Icon, AlertTriangle, Info, AlertCircle } from '$icons';
	import { cn } from '#lib/utils/cn.ts';
	import { untrack, type Snippet, type Component } from 'svelte';

	/**
	 * A confirmation on the `alert-dialog` primitive (role `alertdialog`): focus starts on Cancel, an outside press
	 * does not dismiss it, Escape and Cancel close it unless the action is in flight (`loading` vetoes every way out).
	 * The panel is the `material-pane`; over a form sheet it is opaque (a pane over a pane is never glass on glass).
	 * Cancel comes first in the DOM. The confirm button is a plain Button, not `AlertDialog.Action`: that closes the
	 * dialog on click, and a confirmation closes when its action SUCCEEDS (the caller sets `open` to false).
	 */
	type Props = {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: ConfirmDialogVariant;
		loading?: boolean;
		/** The confirm button is disabled (type-to-confirm not matched, a required reason missing). */
		confirmDisabled?: boolean;
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
		confirmDisabled = false,
		onConfirm,
		onOpenChange,
		body
	}: Props = $props();

	let cancelEl: HTMLElement | null = $state(null);
	// the least destructive action takes focus when the dialog opens (alert-dialog semantics, every variant)
	function focusCancel(e: Event) {
		e.preventDefault();
		untrack(() => cancelEl)?.focus();
	}

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
			iconClass: 'text-info',
			bgClass: 'bg-info-soft'
		},
		warning: {
			icon: AlertTriangle as unknown as Component,
			iconClass: 'text-warning',
			bgClass: 'bg-warning-soft'
		},
		danger: {
			icon: AlertCircle as unknown as Component,
			iconClass: 'text-destructive',
			bgClass: 'bg-destructive-soft'
		}
	};
	const vc = $derived(VARIANT_CONFIG[variant]);
	// Buttons.danger is the only "warm" variant we own; warning + info defer to `default` (a yellow CTA fails
	// contrast targets: the warning's emphasis lives in the icon).
	const buttonVariant = $derived(variant === 'danger' ? 'destructive' : 'default');
</script>

<AlertDialog.Root bind:open busy={loading} {onOpenChange}>
	<AlertDialog.Content onOpenAutoFocus={focusCancel}>
		<AlertDialog.Header>
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
					<AlertDialog.Title>{title}</AlertDialog.Title>
					{#if description}
						<AlertDialog.Description class="body-sm text-muted-foreground"
							>{description}</AlertDialog.Description
						>
					{/if}
				</div>
			</div>
		</AlertDialog.Header>
		{#if body}
			<div class="stack stack-relaxed min-h-0 flex-1 overflow-y-auto">{@render body()}</div>
		{/if}
		<AlertDialog.Footer>
			<AlertDialog.Cancel bind:ref={cancelEl} disabled={loading}>{cancelLabel}</AlertDialog.Cancel>
			<Button variant={buttonVariant} {loading} disabled={confirmDisabled} onclick={onConfirmClick}>
				{confirmLabel}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
