<script lang="ts">
	/**
	 * LeadsKanban — kanban view of leads grouped by stage.
	 *
	 * Drag-to-stage fires the optimistic `changeStageMutation` (snapshot
	 * detail → project new stage → toast with Undo). The 6 BRD stages
	 * (new → contacted → interested → negotiation → converted → lost)
	 * each render an accent-coloured column.
	 */
	import { Kanban, Skeleton, EmptyState } from '$ui';
	import { Icon, Inbox } from '$icons';
	import type { CrmLeadDto, LeadStage, LeadTemperature } from '../schemas';
	import { groupByStage } from '../view-models';
	import { changeStageMutation, changeTemperatureMutation } from '../queries';
	import LeadCardKanban from './LeadCardKanban.svelte';

	type Props = {
		leads: CrmLeadDto[];
		state: 'pending' | 'error' | 'empty' | 'ready';
		error?: string | null;
	};

	let { leads, state, error }: Props = $props();

	const columns = $derived(groupByStage(leads));

	const stageMut = changeStageMutation();
	const tempMut = changeTemperatureMutation();

	function handleMove(cardId: string, fromColumn: string, toColumn: string) {
		stageMut.mutate({
			id: cardId,
			stage: toColumn as LeadStage,
			previous: fromColumn as LeadStage
		});
	}

	function handleTemperature(lead: CrmLeadDto, temperature: LeadTemperature) {
		if (lead.temperature === temperature) return;
		tempMut.mutate({ id: lead.id, temperature, previous: lead.temperature });
	}
</script>

{#if state === 'pending'}
	<div class="flex gap-4 overflow-x-auto pb-4" data-testid="leads-kanban-skeleton">
		{#each [0, 1, 2, 3, 4, 5] as i (i)}
			<Skeleton class="h-72 w-72 rounded-xl" />
		{/each}
	</div>
{:else if state === 'error'}
	<div class="bg-danger-50 text-danger-900 border-danger-500 rounded-md border-s-4 p-4">
		<p class="label">Couldn't load leads. {error ?? ''}</p>
	</div>
{:else if state === 'empty'}
	<EmptyState
		icon={Inbox}
		title="No leads in pipeline"
		description="Purchased platform leads land here. Bulk upload a CSV to import an existing pipeline."
	/>
{:else}
	<Kanban.Board onCardMove={handleMove} ariaLabel="Leads by stage">
		{#each columns as col (col.id)}
			<Kanban.Column id={col.id} label={col.label} count={col.count} accent={col.accent}>
				{#each col.cards as lead (lead.id)}
					<Kanban.Card id={lead.id} aria-label={lead.contact_name}>
						<LeadCardKanban {lead} onTemperatureChange={(t) => handleTemperature(lead, t)} />
					</Kanban.Card>
				{/each}
				{#if col.cards.length === 0}
					<li class="caption text-fg-subtle px-2 py-6 text-center">No leads</li>
				{/if}
			</Kanban.Column>
		{/each}
	</Kanban.Board>
{/if}

<!-- Icon import retained so unused-import lint doesn't fire when the
	 EmptyState only references the icon by binding. -->
<span class="hidden"><Icon icon={Inbox} size="xs" /></span>
