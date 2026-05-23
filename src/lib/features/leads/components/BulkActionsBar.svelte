<script lang="ts">
	import { Button, ConfirmDialog, Dropdown } from '$ui';
	import { Icon, ChevronDown, Trash2, UserCheck, X } from '$icons';
	import { STAGE_OPTIONS } from '$features/leads/view-models';
	import type { LeadStage, BulkLeadActionRequest } from '$features/leads/schemas';

	type Props = {
		selected: ReadonlySet<string>;
		onClear: () => void;
		onAction: (req: BulkLeadActionRequest) => void;
		ownerOptions?: ReadonlyArray<{ value: string; label: string }>;
	};

	let { selected, onClear, onAction, ownerOptions = [] }: Props = $props();

	const ids = $derived(Array.from(selected));
	const count = $derived(ids.length);

	let deleteConfirmOpen = $state(false);

	function changeStage(stage: LeadStage) {
		onAction({ ids, action: 'change_stage', stage });
	}
	function assignOwner(owner_membership_id: string) {
		onAction({ ids, action: 'assign_owner', owner_membership_id });
	}
	function onDeleteClick() {
		deleteConfirmOpen = true;
	}
	function onDeleteConfirm() {
		onAction({ ids, action: 'delete' });
	}
</script>

{#if count > 0}
	<div
		class={[
			'glass-card sticky bottom-4 z-30',
			'mx-auto mt-4 max-w-3xl px-4 py-3',
			'animate-slide-in-bottom'
		]}
		role="region"
		aria-label="Bulk actions"
		data-testid="bulk-actions-bar"
	>
		<div class="cluster cluster-spread">
			<div class="cluster cluster-tight">
				<button
					type="button"
					class="hover:bg-bg-muted rounded-md p-1.5"
					aria-label="Clear selection"
					onclick={onClear}
				>
					<Icon icon={X} size="sm" />
				</button>
				<span class="label text-fg">{count} selected</span>
			</div>

			<div class="cluster cluster-tight">
				<Dropdown.Root>
					<Dropdown.Trigger>
						<Button variant="tonal" size="sm">
							Change stage <Icon icon={ChevronDown} size="xs" />
						</Button>
					</Dropdown.Trigger>
					<Dropdown.Menu>
						{#each STAGE_OPTIONS as s (s.value)}
							<Dropdown.Item onSelect={() => changeStage(s.value)}>{s.label}</Dropdown.Item>
						{/each}
					</Dropdown.Menu>
				</Dropdown.Root>

				{#if ownerOptions.length > 0}
					<Dropdown.Root>
						<Dropdown.Trigger>
							<Button variant="tonal" size="sm">
								<Icon icon={UserCheck} size="xs" /> Assign owner
								<Icon icon={ChevronDown} size="xs" />
							</Button>
						</Dropdown.Trigger>
						<Dropdown.Menu>
							{#each ownerOptions as o (o.value)}
								<Dropdown.Item onSelect={() => assignOwner(o.value)}>{o.label}</Dropdown.Item>
							{/each}
						</Dropdown.Menu>
					</Dropdown.Root>
				{/if}

				<Button variant="danger" size="sm" onclick={onDeleteClick}>
					<Icon icon={Trash2} size="xs" /> Delete
				</Button>
			</div>
		</div>
	</div>

	<ConfirmDialog
		bind:open={deleteConfirmOpen}
		title="Delete leads"
		description={`Permanently delete ${count} ${count === 1 ? 'lead' : 'leads'}? This cannot be undone.`}
		confirmLabel="Delete"
		variant="danger"
		onConfirm={onDeleteConfirm}
	/>
{/if}
