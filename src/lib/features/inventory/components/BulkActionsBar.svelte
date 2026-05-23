<script lang="ts">
	import { Button } from '$ui';
	import { Icon, X, Check, Pause, Trash2 } from '$icons';

	/**
	 * Sticky bottom bar surfacing bulk actions once the user has
	 * selected one or more rows. Pattern reference: Linear / Notion
	 * / Asana — "you have N selected, here are the things you can do".
	 *
	 * Hidden when count === 0.
	 */

	type Props = {
		count: number;
		onActivate: () => void;
		onDeactivate: () => void;
		onDelete: () => void;
		onClear: () => void;
		disabled?: boolean;
	};

	let { count, onActivate, onDeactivate, onDelete, onClear, disabled = false }: Props = $props();
</script>

{#if count > 0}
	<div
		class="border-border bg-bg-elevated fixed inset-x-0 z-[var(--z-toast)] border-t px-4 py-3 shadow-[var(--shadow-lg)]"
		style="bottom: calc(var(--lk-footer-height, 2.5rem) + var(--safe-bottom, 0px) + 1rem);"
		role="region"
		aria-label="Bulk actions"
		data-testid="bulk-actions-bar"
	>
		<div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
			<div class="cluster cluster-tight">
				<button
					type="button"
					aria-label="Clear selection"
					class="hover:bg-bg-muted rounded-md p-1.5"
					onclick={onClear}
				>
					<Icon icon={X} size="sm" />
				</button>
				<span class="label text-fg">
					{count} selected
				</span>
			</div>
			<div class="cluster cluster-tight">
				<Button variant="tonal" size="sm" onclick={onActivate} {disabled}>
					<Icon icon={Check} size="sm" /> Activate
				</Button>
				<Button variant="tonal" size="sm" onclick={onDeactivate} {disabled}>
					<Icon icon={Pause} size="sm" /> Deactivate
				</Button>
				<Button variant="danger" size="sm" onclick={onDelete} {disabled}>
					<Icon icon={Trash2} size="sm" /> Delete
				</Button>
			</div>
		</div>
	</div>
{/if}
