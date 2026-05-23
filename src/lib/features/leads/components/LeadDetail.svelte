<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, Badge, Button, Card, ConfirmDialog, CopyButton, Dropdown, Skeleton } from '$ui';
	import { Icon, ChevronLeft, ChevronDown, Edit, Trash2 } from '$icons';
	import {
		leadDetailQuery,
		deleteLeadMutation,
		changeStageMutation,
		updateLeadMutation
	} from '$features/leads/queries';
	import {
		formatValue,
		sourceLabel,
		stageBadge,
		STAGE_OPTIONS,
		relativeTime
	} from '$features/leads/view-models';
	import type { LeadStage } from '$features/leads/schemas';
	import EditLeadDrawer from './EditLeadDrawer.svelte';

	type Props = { id: string };
	let { id }: Props = $props();

	const query = $derived(leadDetailQuery(id));
	const lead = $derived(query.data ?? null);

	const deleteMutation = deleteLeadMutation();
	const stageMutation = changeStageMutation();
	const updateMutation = updateLeadMutation();

	let editOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	let followupInput = $state('');

	$effect(() => {
		if (lead?.next_followup_at) {
			// HTML datetime-local value: YYYY-MM-DDTHH:mm
			followupInput = new Date(lead.next_followup_at).toISOString().slice(0, 16);
		} else if (lead) {
			followupInput = '';
		}
	});

	function selectStage(s: LeadStage) {
		if (!lead || lead.stage === s) return;
		stageMutation.mutate({ id: lead.id, stage: s, previous: lead.stage });
	}

	function saveFollowup() {
		if (!lead) return;
		updateMutation.mutate({
			id: lead.id,
			req: { next_followup_at: followupInput ? new Date(followupInput).toISOString() : undefined }
		});
	}

	async function doDelete() {
		if (!lead) return;
		deleteMutation.mutate(lead.id, {
			onSuccess: () => {
				confirmDeleteOpen = false;
				goto('/leads');
			}
		});
	}
</script>

<div class="stack stack-relaxed">
	<a href="/leads" class="cluster cluster-tight text-fg-muted hover:text-fg caption inline-flex">
		<Icon icon={ChevronLeft} size="xs" /> Back to leads
	</a>

	{#if query.isPending}
		<div class="stack stack-relaxed" aria-busy="true">
			<Skeleton class="h-8 w-1/2" />
			<Skeleton class="h-32 w-full rounded-md" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if query.isError || !lead}
		<Alert variant="warning" title="Lead not found">
			This lead doesn't exist or you don't have access.
		</Alert>
	{:else}
		{@const meta = stageBadge(lead.stage)}
		<header class="cluster cluster-spread">
			<div class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1">{lead.full_name}</h1>
					<!-- Inline-editable stage pill -->
					<Dropdown.Root>
						<Dropdown.Trigger>
							<button
								type="button"
								class="focus-visible:ring-focus-ring inline-flex items-center gap-1 rounded-full focus-visible:ring-2 focus-visible:outline-none"
								aria-label={`Change stage. Current: ${meta.label}`}
								data-testid="stage-pill"
							>
								<Badge variant={meta.variant} style="soft" size="md">{meta.label}</Badge>
								<Icon icon={ChevronDown} size="xs" />
							</button>
						</Dropdown.Trigger>
						<Dropdown.Menu>
							{#each STAGE_OPTIONS as s (s.value)}
								<Dropdown.Item onSelect={() => selectStage(s.value)}>{s.label}</Dropdown.Item>
							{/each}
						</Dropdown.Menu>
					</Dropdown.Root>
				</div>
				{#if lead.company}
					<p class="body-base text-fg-muted">{lead.company}</p>
				{/if}
				<div class="cluster cluster-tight">
					<code class="caption text-fg-subtle">{lead.id}</code>
					<CopyButton value={lead.id} label="Copy lead ID" />
				</div>
			</div>
			<div class="cluster cluster-tight">
				<Button variant="tonal" onclick={() => (editOpen = true)}>
					<Icon icon={Edit} size="sm" /> Edit
				</Button>
				<Button variant="danger" onclick={() => (confirmDeleteOpen = true)}>
					<Icon icon={Trash2} size="sm" /> Delete
				</Button>
			</div>
		</header>

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<!-- LEFT: contact + tags + notes (2/3) -->
			<div class="stack stack-relaxed lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title>Contact</Card.Title>
					</Card.Header>
					<Card.Content>
						<dl class="grid grid-cols-2 gap-x-6 gap-y-3">
							<div>
								<dt class="caption text-fg-muted">Source</dt>
								<dd class="body-base">{sourceLabel(lead.source)}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Value</dt>
								<dd class="body-base">{formatValue(lead.value, lead.currency)}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Email</dt>
								<dd class="body-base">{lead.email ?? '—'}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Phone</dt>
								<dd class="body-base">{lead.phone ?? '—'}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Last contacted</dt>
								<dd class="body-base">{relativeTime(lead.last_contacted_at)}</dd>
							</div>
							<div>
								<dt class="caption text-fg-muted">Created</dt>
								<dd class="body-base">{new Date(lead.created_at).toLocaleString()}</dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>

				{#if lead.tags && lead.tags.length > 0}
					<Card.Root>
						<Card.Header><Card.Title>Tags</Card.Title></Card.Header>
						<Card.Content>
							<div class="cluster cluster-tight flex-wrap">
								{#each lead.tags as tag (tag)}
									<Badge variant="neutral" style="outline" size="sm">{tag}</Badge>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<Card.Root>
					<Card.Header><Card.Title>Notes</Card.Title></Card.Header>
					<Card.Content>
						{#if lead.notes}
							<p class="body-base whitespace-pre-wrap">{lead.notes}</p>
						{:else}
							<p class="body-sm text-fg-muted">No notes yet.</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>

			<!-- RIGHT: activity + followup (1/3) -->
			<div class="stack stack-relaxed">
				<Card.Root>
					<Card.Header><Card.Title>Activity</Card.Title></Card.Header>
					<Card.Content>
						<p class="body-sm text-fg-muted">
							Activity feed lands in v0.6 — call logs, emails, and stage transitions will surface
							here.
						</p>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Next followup</Card.Title>
						<Card.Description>
							{#if lead.next_followup_at}
								{relativeTime(lead.next_followup_at)}
							{:else}
								Not scheduled.
							{/if}
						</Card.Description>
					</Card.Header>
					<Card.Content class="stack stack-tight">
						<label class="stack stack-tight">
							<span class="caption text-fg-muted">Date & time</span>
							<input
								type="datetime-local"
								bind:value={followupInput}
								class="glass-input rounded-md px-3 py-2 text-sm"
							/>
						</label>
						<Button
							size="sm"
							variant="tonal"
							onclick={saveFollowup}
							loading={updateMutation.isPending}
						>
							Save followup
						</Button>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header><Card.Title>Owner</Card.Title></Card.Header>
					<Card.Content>
						{#if lead.owner_membership_id}
							<code class="caption text-fg-subtle">{lead.owner_membership_id}</code>
						{:else}
							<p class="body-sm text-fg-muted">Unassigned.</p>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	{/if}
</div>

<EditLeadDrawer bind:open={editOpen} onOpenChange={(o) => (editOpen = o)} {lead} />

<ConfirmDialog
	bind:open={confirmDeleteOpen}
	title="Delete lead"
	description="This will move the lead to the soft-deleted state. Existing references stay intact."
	confirmLabel="Delete"
	variant="danger"
	loading={deleteMutation.isPending}
	onConfirm={doDelete}
	onOpenChange={(o) => (confirmDeleteOpen = o)}
/>
