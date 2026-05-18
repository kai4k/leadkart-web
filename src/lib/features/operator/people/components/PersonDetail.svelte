<script lang="ts">
	import { Alert, Avatar, Badge, Button, Card, Spinner } from '$ui';
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
	import { hasPermission } from '$features/auth/tier';
	import { session } from '$features/auth/stores/session.svelte';
	import type { PersonDto } from '$features/operator/people/types';
	import GlobalSuspendDialog from './GlobalSuspendDialog.svelte';
	import AnonymiseDialog from './AnonymiseDialog.svelte';

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

	const canManage = $derived(hasPermission(session.principal, 'platform.users.manage'));
	const canAnonymiseOp = $derived(hasPermission(session.principal, 'identity.users.anonymise'));

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
	<div class="flex justify-center py-16"><Spinner size={32} /></div>
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
		<a
			href="/operator/people"
			class="caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">← All people</a
		>

		<!-- Identity card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Identity</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="cluster items-start gap-4">
					<Avatar initials={initials(displayName)} size="lg" />
					<div class="stack stack-tight">
						<div class="cluster cluster-tight">
							<span class="h2">{displayName}</span>
							<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
						</div>
						<p class="body-base text-[var(--color-fg-muted)]">{p.email}</p>
						<p class="caption text-[var(--color-fg-subtle)]">ID <code>{p.id}</code></p>
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
					<div class="flex justify-center py-4"><Spinner size={24} /></div>
				{:else if memberships.length === 0}
					<p class="body-base text-[var(--color-fg-muted)]">No memberships found.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-[var(--color-border)]">
									<th class="caption py-2 pr-4 text-left text-[var(--color-fg-muted)]">Tenant ID</th
									>
									<th class="caption py-2 pr-4 text-left text-[var(--color-fg-muted)]"
										>Designation</th
									>
									<th class="caption py-2 text-left text-[var(--color-fg-muted)]">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each memberships as m (m.membership_id)}
									<tr class="border-b border-[var(--color-border-subtle)] last:border-0">
										<td class="py-2 pr-4">
											<code class="caption">{m.tenant_id}</code>
										</td>
										<td class="py-2 pr-4 text-[var(--color-fg)]">{m.designation || '—'}</td>
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
