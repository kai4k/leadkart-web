<script lang="ts">
	import { Alert, Avatar, Badge, Button, Card, CopyButton, Skeleton } from '$ui';
	import { Pause, Play, UserMinus, Icon } from '$icons';
	import {
		personDetailQuery,
		personMembershipsQuery,
		liftGlobalSuspensionMutation
	} from '$features/operator/people/queries';
	import {
		personDisplayName,
		personLifecycleBadge,
		canGloballySuspend,
		canLiftSuspension,
		canAnonymise
	} from '$features/operator/people/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import type { PersonDto } from '$features/operator/people/types';
	import GlobalSuspendDialog from './GlobalSuspendDialog.svelte';
	import AnonymiseDialog from './AnonymiseDialog.svelte';
	import { personActivityQuery } from '$lib/features/audit/queries';
	import ActivityTimeline from '$lib/features/audit/components/ActivityTimeline.svelte';

	type Props = { personId: string };
	let { personId }: Props = $props();

	let suspendOpen = $state(false);
	let anonymiseOpen = $state(false);
	let target = $state<PersonDto | null>(null);

	const query = $derived(personDetailQuery(personId));
	const membershipsQuery = $derived(personMembershipsQuery(personId));
	const liftMutation = liftGlobalSuspensionMutation();

	const p = $derived(query.data ?? null);
	const memberships = $derived(membershipsQuery.data?.memberships ?? []);
	const isLoading = $derived(query.isPending);
	const isError = $derived(query.isError);
	const errorMsg = $derived(
		query.error instanceof Error ? query.error.message : 'Failed to load person'
	);
	const isPending = $derived(liftMutation.isPending);

	const capsQuery = myCapabilitiesQuery();
	const canManage = $derived(hasCapability(capsQuery.data, 'platform.users.manage'));
	const canAnonymiseOp = $derived(hasCapability(capsQuery.data, 'identity.users.anonymise'));

	const activityQuery = $derived(personId ? personActivityQuery(personId) : null);

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	function liftSuspension(id: string) {
		liftMutation.mutate(id);
	}
</script>

{#if isLoading}
	<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading person">
		<Card.Root>
			<Card.Content>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
					<Skeleton shape="circle" class="h-16 w-16" />
					<div class="stack stack-tight min-w-0 flex-1">
						<Skeleton class="h-6 w-1/2" />
						<Skeleton class="h-4 w-2/3" />
						<Skeleton class="h-3 w-1/3" />
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Content>
				<Skeleton class="h-24 w-full rounded-md" />
			</Card.Content>
		</Card.Root>
	</div>
{:else if isError}
	<Alert variant="danger" title="Load failed">{errorMsg}</Alert>
{:else if !p}
	<Alert variant="warning" title="Person not found"
		>No person with that ID, or you don't have access.</Alert
	>
{:else}
	{@const badge = personLifecycleBadge(p)}
	{@const displayName = personDisplayName(p)}

	<div class="stack stack-relaxed">
		<!-- Identity card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Identity</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-start">
					<Avatar initials={initials(displayName)} size="lg" />
					<div class="stack stack-tight min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<span class="h2">{displayName}</span>
							<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
						</div>
						<div class="cluster cluster-tight flex-wrap">
							<p class="body-base text-fg-muted break-all">{p.email}</p>
							<CopyButton value={p.email} label="Copy email" />
						</div>
						<div class="cluster cluster-tight flex-wrap">
							<p class="caption text-fg-subtle">
								ID <code class="break-all">{p.id}</code>
							</p>
							<CopyButton value={p.id} label="Copy person ID" />
						</div>
					</div>
				</div>

				{#if p.is_globally_suspended && p.global_suspension_reason}
					<Alert variant="danger" class="mt-4">
						<strong>Suspension reason:</strong>
						{p.global_suspension_reason}
					</Alert>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Memberships card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Memberships</Card.Title>
				<Card.Description>Cross-tenant membership records for this person.</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if membershipsQuery.isPending}
					<div class="stack stack-tight" aria-busy="true">
						{#each [0, 1, 2] as i (i)}
							<Skeleton class="h-8 w-full rounded-md" />
						{/each}
					</div>
				{:else if memberships.length === 0}
					<p class="body-base text-fg-muted">No memberships found.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-border border-b">
									<th class="caption text-fg-muted py-2 pr-4 text-left">Tenant ID</th>
									<th class="caption text-fg-muted py-2 pr-4 text-left">Designation</th>
									<th class="caption text-fg-muted py-2 text-left">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each memberships as m (m.membership_id)}
									<tr class="border-b border-[var(--color-border-subtle)] last:border-0">
										<td class="py-2 pr-4">
											<code class="caption">{m.tenant_id}</code>
										</td>
										<td class="text-fg py-2 pr-4">{m.designation || '—'}</td>
										<td class="py-2">
											<Badge
												variant={m.status === 'active' ? 'success' : 'warning'}
												style="soft"
												size="sm">{m.status}</Badge
											>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Activity timeline -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Activity</Card.Title>
				<Card.Description>Audit log for this person.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ActivityTimeline
					data={activityQuery?.data ?? null}
					isPending={activityQuery?.isPending ?? true}
					isError={activityQuery?.isError ?? false}
					errorMessage={activityQuery?.error instanceof Error
						? activityQuery.error.message
						: 'Failed to load activity'}
				/>
			</Card.Content>
		</Card.Root>

		<!-- Action panel -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Lifecycle</Card.Title>
				<Card.Description
					>{canManage
						? 'Operator-tier mutations on this person.'
						: 'Read-only — you lack platform.users.manage.'}</Card.Description
				>
			</Card.Header>
			<Card.Content class="cluster">
				{#if canManage && canGloballySuspend(p)}
					<Button
						variant="ghost"
						onclick={() => {
							target = p;
							suspendOpen = true;
						}}
						disabled={isPending}
					>
						<Icon icon={Pause} size="sm" /> Globally suspend
					</Button>
				{/if}
				{#if canManage && canLiftSuspension(p)}
					<Button variant="ghost" onclick={() => liftSuspension(p.id)} loading={isPending}>
						<Icon icon={Play} size="sm" /> Lift suspension
					</Button>
				{/if}
				{#if canAnonymiseOp && canAnonymise(p)}
					<Button
						variant="danger"
						onclick={() => {
							target = p;
							anonymiseOpen = true;
						}}
						disabled={isPending}
					>
						<Icon icon={UserMinus} size="sm" /> Anonymise
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<GlobalSuspendDialog
	bind:open={suspendOpen}
	person={target}
	onOpenChange={(o) => (suspendOpen = o)}
/>
<AnonymiseDialog
	bind:open={anonymiseOpen}
	person={target}
	onOpenChange={(o) => (anonymiseOpen = o)}
/>
