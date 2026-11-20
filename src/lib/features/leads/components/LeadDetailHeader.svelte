<script lang="ts">
	import PageHeader from '$layouts/PageHeader.svelte';
	import { ACTION, session } from '$features/auth';
	/**
	 * LeadDetailHeader — top-of-page identity strip for a single lead.
	 *
	 * Contact identity is locked (BRD §5) so the contact_name, mobile_number,
	 * and address are display-only. Stage + temperature pills are
	 * interactive — clicking opens the StatusPill dropdown and fires the
	 * optimistic PATCH mutation. Edit / Reassign buttons emit events to
	 * the parent which owns the drawers/dialogs.
	 */
	import { Button, StatusPill } from '$ui';
	import { Icon, Edit, Users, UserCheck } from '$icons';
	import type { CrmLeadDto, LeadStage, LeadTemperature } from '../schemas';
	import { STAGE_OPTIONS, TEMPERATURE_OPTIONS, locationLabel } from '../view-models';
	import { changeStageMutation, changeTemperatureMutation } from '../queries';

	type Props = {
		lead: CrmLeadDto;
		onEdit: () => void;
		onReassign: () => void;
	};

	let { lead, onEdit, onReassign }: Props = $props();
	const mayAssign = $derived(session.canAny(...ACTION.leadAssign));
	const mayManage = $derived(session.canAny(...ACTION.leadManage));

	const stageMut = changeStageMutation();
	const tempMut = changeTemperatureMutation();

	function changeStage(stage: string) {
		if (lead.stage === stage) return;
		stageMut.mutate({ id: lead.id, stage: stage as LeadStage, previous: lead.stage });
	}
	function changeTemperature(t: string) {
		if (lead.temperature === t) return;
		tempMut.mutate({ id: lead.id, temperature: t as LeadTemperature, previous: lead.temperature });
	}
</script>

<PageHeader title={lead.contact_name} />

<header class="stack stack-tight" data-testid="lead-detail-header">
	<div class="cluster cluster-spread items-start">
		<div class="stack stack-tight min-w-0">
			<div class="cluster cluster-tight flex-wrap">
				<span class="caption text-muted-foreground"
					><Icon icon={Users} size="xs" /> {lead.mobile_number}</span
				>
				{#if lead.email}
					<span class="caption text-muted-foreground">· {lead.email}</span>
				{/if}
				<span class="caption text-muted-foreground">· {locationLabel(lead)}</span>
			</div>
		</div>
		<div class="cluster cluster-tight shrink-0">
			{#if mayAssign}
				<Button variant="tonal" size="sm" onclick={onReassign}>
					<Icon icon={UserCheck} size="xs" /> Reassign
				</Button>
			{/if}
			{#if mayManage}
				<Button size="sm" onclick={onEdit}>
					<Icon icon={Edit} size="xs" /> Edit
				</Button>
			{/if}
		</div>
	</div>

	<div class="cluster cluster-tight">
		<span class="caption text-muted-foreground">Stage:</span>
		<StatusPill
			value={lead.stage}
			options={[...STAGE_OPTIONS]}
			onChange={changeStage}
			disabled={!mayManage}
		/>
		<span class="caption text-muted-foreground">· Temperature:</span>
		<StatusPill
			value={lead.temperature}
			options={[...TEMPERATURE_OPTIONS]}
			onChange={changeTemperature}
			disabled={!mayManage}
		/>
	</div>
</header>
