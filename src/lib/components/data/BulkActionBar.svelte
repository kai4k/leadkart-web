<!-- src/lib/components/data/BulkActionBar.svelte -->
<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface BulkAction {
		id: string;
		label: string;
		icon?: Component;
		variant?: 'default' | 'danger';
		onClick: () => void | Promise<void>;
		/**
		 * Optional confirm dialog gate. When set the action button
		 * opens a `<ConfirmDialog>` whose Confirm wires through to
		 * `onClick`.
		 */
		confirm?: { title: string; description?: string; confirmLabel?: string };
		/** Disable the action while another mutation is in flight. */
		disabled?: boolean;
	}
</script>

<script lang="ts" generics="TItem extends import('$lib/hooks').SelectableItem">
	import type { UseBulkSelection } from '$lib/hooks';
	import { Button, ConfirmDialog } from '$ui';
	import { Icon } from '$icons';
	import { cn } from '$lib/utils/cn';

	/**
	 * BulkActionBar — sticky bottom action bar that appears once the
	 * selection set is non-empty. Mirrors Gmail / Linear / Stripe
	 * dashboard conventions: a single horizontal row with a count
	 * marker, action buttons, and a "Clear selection" link on the
	 * right.
	 *
	 * `role="status"` + `aria-live="polite"` so screen readers
	 * announce the selection count as it changes.
	 */

	type Props = {
		selection: UseBulkSelection<TItem>;
		actions: BulkAction[];
		class?: string;
	};

	let { selection, actions, class: className = '' }: Props = $props();

	let pendingConfirm: BulkAction | null = $state(null);
	let runningId: string | null = $state(null);

	async function runAction(action: BulkAction) {
		if (action.confirm) {
			pendingConfirm = action;
			return;
		}
		runningId = action.id;
		try {
			await action.onClick();
		} finally {
			runningId = null;
		}
	}

	async function confirmCurrent() {
		const a = pendingConfirm;
		if (!a) return;
		runningId = a.id;
		try {
			await a.onClick();
		} finally {
			runningId = null;
			pendingConfirm = null;
		}
	}
</script>

{#if selection.count > 0}
	<div
		role="status"
		aria-live="polite"
		class={cn(
			'glass-card sticky bottom-4 z-10 mx-auto w-full max-w-3xl',
			'cluster cluster-spread items-center gap-4 px-4 py-3',
			className
		)}
	>
		<p class="label text-fg">
			<span class="font-semibold">{selection.count}</span> selected
		</p>

		<div class="cluster cluster-tight">
			{#each actions as action (action.id)}
				<Button
					size="sm"
					variant={action.variant === 'danger' ? 'danger' : 'secondary'}
					loading={runningId === action.id}
					disabled={action.disabled || runningId !== null}
					onclick={() => runAction(action)}
				>
					{#if action.icon}
						<Icon icon={action.icon} size="sm" />
					{/if}
					{action.label}
				</Button>
			{/each}
		</div>

		<button
			type="button"
			class="label text-fg-muted hover:text-fg hover:underline"
			onclick={() => selection.clear()}
		>
			Clear selection
		</button>
	</div>
{/if}

{#if pendingConfirm}
	<ConfirmDialog
		open={true}
		title={pendingConfirm.confirm!.title}
		description={pendingConfirm.confirm!.description}
		confirmLabel={pendingConfirm.confirm!.confirmLabel ?? pendingConfirm.label}
		variant={pendingConfirm.variant === 'danger' ? 'danger' : 'default'}
		loading={runningId === pendingConfirm.id}
		onConfirm={confirmCurrent}
		onOpenChange={(o) => {
			if (!o) pendingConfirm = null;
		}}
	/>
{/if}
