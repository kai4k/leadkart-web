<!-- src/lib/components/ui/ConfirmDialog.svelte -->
<script lang="ts">
	import * as Dialog from './dialog/index.js';
	import Button from './Button.svelte';
	import type { Snippet } from 'svelte';

	type Variant = 'default' | 'danger';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		variant?: Variant;
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
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">{title}</h2>
				{#if description}<p class="body-sm text-[var(--color-fg-muted)]">{description}</p>{/if}
			</div>
		</Dialog.Header>
		{#if body}
			<Dialog.Body>{@render body()}</Dialog.Body>
		{/if}
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={loading}>{cancelLabel}</Button>
			</Dialog.Close>
			<Button
				variant={variant === 'danger' ? 'danger' : 'primary'}
				{loading}
				onclick={onConfirmClick}
			>
				{confirmLabel}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
