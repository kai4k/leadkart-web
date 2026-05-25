<!-- src/lib/components/data/BulkActionBar.svelte -->
<script lang="ts" module>
	import type { Component } from 'svelte';

	export interface BulkActionSubItem {
		id: string;
		label: string;
		onClick: () => void | Promise<void>;
	}

	export interface BulkAction {
		id: string;
		label: string;
		icon?: Component;
		variant?: 'default' | 'danger';
		/**
		 * Direct action. Mutually exclusive with `subActions` — supplying
		 * both is a programmer error and surfaces a runtime warning. The
		 * action renders as a simple button when `onClick` is set.
		 */
		onClick?: () => void | Promise<void>;
		/**
		 * Sub-action dropdown (Linear bulk-bar canon). When present the
		 * action renders as a Dropdown.Trigger button; clicking opens a
		 * menu listing each sub-item, and selecting a sub-item fires its
		 * own `onClick`. Sub-action items do NOT carry their own confirm
		 * — wrap with a confirm dialog in the sub-item handler if needed.
		 */
		subActions?: ReadonlyArray<BulkActionSubItem>;
		/**
		 * Optional confirm dialog gate. When set the action button
		 * opens a `<ConfirmDialog>` whose Confirm wires through to
		 * `onClick`. Ignored when `subActions` is set.
		 */
		confirm?: { title: string; description?: string; confirmLabel?: string };
		/** Disable the action while another mutation is in flight. */
		disabled?: boolean;
	}
</script>

<script lang="ts" generics="TItem extends import('$lib/hooks').SelectableItem">
	import type { UseBulkSelection } from '$lib/hooks';
	import { Button, ConfirmDialog, Dropdown } from '$ui';
	import { Icon, ChevronDown } from '$icons';
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

	// Validate at construction time — a misconfigured action should be
	// surfaced early in dev (silent in prod via dead-code elimination).
	$effect(() => {
		for (const a of actions) {
			if (a.subActions && a.onClick) {
				console.warn(
					`[BulkActionBar] action "${a.id}" sets both onClick and subActions — subActions wins. Drop onClick to silence.`
				);
			}
		}
	});

	async function runAction(action: BulkAction) {
		if (action.confirm) {
			pendingConfirm = action;
			return;
		}
		if (!action.onClick) return;
		runningId = action.id;
		try {
			await action.onClick();
		} finally {
			runningId = null;
		}
	}

	async function runSubAction(parentId: string, sub: BulkActionSubItem) {
		runningId = parentId;
		try {
			await sub.onClick();
		} finally {
			runningId = null;
		}
	}

	async function confirmCurrent() {
		const a = pendingConfirm;
		if (!a || !a.onClick) return;
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
		class={cn(
			'glass-card sticky bottom-4 z-10 mx-auto w-full max-w-3xl',
			'cluster cluster-spread items-center gap-4 px-4 py-3',
			className
		)}
	>
		<p class="label text-fg" role="status" aria-live="polite">
			<span class="font-semibold">{selection.count}</span> selected
		</p>

		<div class="cluster cluster-tight">
			{#each actions as action (action.id)}
				{#if action.subActions && action.subActions.length > 0}
					<Dropdown.Root>
						<Dropdown.Trigger>
							<Button
								size="sm"
								variant={action.variant === 'danger' ? 'danger' : 'secondary'}
								loading={runningId === action.id}
								disabled={action.disabled || runningId !== null}
							>
								{#if action.icon}
									<Icon icon={action.icon} size="sm" />
								{/if}
								{action.label}
								<Icon icon={ChevronDown} size="xs" />
							</Button>
						</Dropdown.Trigger>
						<Dropdown.Menu align="end">
							{#each action.subActions as sub (sub.id)}
								<Dropdown.Item onSelect={() => runSubAction(action.id, sub)}>
									{sub.label}
								</Dropdown.Item>
							{/each}
						</Dropdown.Menu>
					</Dropdown.Root>
				{:else}
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
				{/if}
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

{#if pendingConfirm?.confirm}
	{@const confirm = pendingConfirm.confirm}
	<ConfirmDialog
		open={true}
		title={confirm.title}
		description={confirm.description}
		confirmLabel={confirm.confirmLabel ?? pendingConfirm.label}
		variant={pendingConfirm.variant === 'danger' ? 'danger' : 'default'}
		loading={runningId === pendingConfirm.id}
		onConfirm={confirmCurrent}
		onOpenChange={(o) => {
			if (!o) pendingConfirm = null;
		}}
	/>
{/if}
