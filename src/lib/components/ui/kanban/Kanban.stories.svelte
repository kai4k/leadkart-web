<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Kanban from '$ui/kanban';
	import Badge from '$ui/Badge.svelte';

	const { Story } = defineMeta({
		title: 'UI/Kanban',
		component: Kanban.Board,
		tags: ['autodocs']
	});

	type Lead = {
		id: string;
		name: string;
		company: string;
		value: string;
		owner: string;
	};

	const NEW_LEADS: Lead[] = [
		{
			id: 'l1',
			name: 'Priya Sharma',
			company: 'MediCare Distributors',
			value: '₹4,20,000',
			owner: 'AC'
		},
		{ id: 'l2', name: 'Rahul Verma', company: 'HealWell Pharma', value: '₹1,85,000', owner: 'NS' }
	];

	const CONTACTED: Lead[] = [
		{ id: 'l3', name: 'Aisha Khan', company: 'Wellness Plus', value: '₹8,40,000', owner: 'AC' }
	];

	const QUALIFIED: Lead[] = [
		{
			id: 'l4',
			name: 'Vikram Singh',
			company: 'Apex Healthcare',
			value: '₹12,00,000',
			owner: 'AC'
		},
		{ id: 'l5', name: 'Meera Iyer', company: 'CarePoint', value: '₹6,75,000', owner: 'NS' }
	];

	const CLOSED: Lead[] = [
		{ id: 'l6', name: 'Sneha Patel', company: 'GreenLife Pharma', value: '₹22,00,000', owner: 'AC' }
	];
</script>

<Story name="Lead pipeline">
	<div style="width: 100%; max-width: 1080px;">
		<Kanban.Board ariaLabel="Lead pipeline" onCardMove={() => {}}>
			<Kanban.Column id="new" label="New" count={NEW_LEADS.length} accent="info">
				{#each NEW_LEADS as lead (lead.id)}
					<Kanban.Card id={lead.id} aria-label={lead.name}>
						<div class="stack stack-tight">
							<p class="body-sm text-fg font-medium">{lead.name}</p>
							<p class="caption text-fg-muted truncate-1">{lead.company}</p>
							<div class="flex items-center justify-between">
								<span class="caption text-fg tabular-nums">{lead.value}</span>
								<Badge variant="neutral" appearance="soft" size="sm">{lead.owner}</Badge>
							</div>
						</div>
					</Kanban.Card>
				{/each}
			</Kanban.Column>

			<Kanban.Column id="contacted" label="Contacted" count={CONTACTED.length} accent="warning">
				{#each CONTACTED as lead (lead.id)}
					<Kanban.Card id={lead.id} aria-label={lead.name}>
						<div class="stack stack-tight">
							<p class="body-sm text-fg font-medium">{lead.name}</p>
							<p class="caption text-fg-muted truncate-1">{lead.company}</p>
							<div class="flex items-center justify-between">
								<span class="caption text-fg tabular-nums">{lead.value}</span>
								<Badge variant="neutral" appearance="soft" size="sm">{lead.owner}</Badge>
							</div>
						</div>
					</Kanban.Card>
				{/each}
			</Kanban.Column>

			<Kanban.Column id="qualified" label="Qualified" count={QUALIFIED.length} accent="primary">
				{#each QUALIFIED as lead (lead.id)}
					<Kanban.Card id={lead.id} aria-label={lead.name}>
						<div class="stack stack-tight">
							<p class="body-sm text-fg font-medium">{lead.name}</p>
							<p class="caption text-fg-muted truncate-1">{lead.company}</p>
							<div class="flex items-center justify-between">
								<span class="caption text-fg tabular-nums">{lead.value}</span>
								<Badge variant="neutral" appearance="soft" size="sm">{lead.owner}</Badge>
							</div>
						</div>
					</Kanban.Card>
				{/each}
			</Kanban.Column>

			<Kanban.Column id="closed" label="Closed" count={CLOSED.length} accent="success">
				{#each CLOSED as lead (lead.id)}
					<Kanban.Card id={lead.id} aria-label={lead.name}>
						<div class="stack stack-tight">
							<p class="body-sm text-fg font-medium">{lead.name}</p>
							<p class="caption text-fg-muted truncate-1">{lead.company}</p>
							<div class="flex items-center justify-between">
								<span class="caption text-fg tabular-nums">{lead.value}</span>
								<Badge variant="neutral" appearance="soft" size="sm">{lead.owner}</Badge>
							</div>
						</div>
					</Kanban.Card>
				{/each}
			</Kanban.Column>
		</Kanban.Board>
	</div>
</Story>

<Story name="Empty column">
	<div style="width: 720px;">
		<Kanban.Board ariaLabel="Empty board demo" onCardMove={() => {}}>
			<Kanban.Column id="new" label="New" count={0} accent="info" />
			<Kanban.Column id="active" label="Active" count={1} accent="primary">
				<Kanban.Card id="x1" aria-label="Sample card">
					<p class="body-sm text-fg font-medium">Sample card</p>
				</Kanban.Card>
			</Kanban.Column>
		</Kanban.Board>
	</div>
</Story>
