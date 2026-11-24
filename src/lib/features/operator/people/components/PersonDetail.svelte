<script lang="ts">
	import { createDialogState } from '#lib/hooks/index.ts';
	import { confirmLeave } from '#lib/hooks/use-leave-guard.svelte.ts';
	import { SvelteMap } from 'svelte/reactivity';
	import { Alert, Badge, Button, Card, CopyButton, Skeleton } from '$ui';
	import { IdChip, IdentityCell, type DataTableColumn } from '#lib/components/data/index.ts';
	import { DataTable } from '#lib/components/data/data-table/index.ts';
	import { enterScopeMutation } from '$features/operator/scope';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { ArrowRight, Pause, Play, Icon } from '$icons';
	import { tenantsListQuery } from '../../tenants';
	import {
		personDetailQuery,
		personMembershipsQuery,
		liftGlobalSuspensionMutation
	} from '../queries';
	import {
		personDisplayName,
		personLifecycle,
		personLifecycleKey,
		canGloballySuspend,
		canLiftSuspension
	} from '../view-models';
	import { P, session, userStatus, type UserDto } from '$features/auth';
	import type { PersonDto } from '../types';
	import GlobalSuspendDialog from './GlobalSuspendDialog.svelte';
	import { formatDate } from '#lib/utils/format.ts';

	type Props = { personId: string };
	let { personId }: Props = $props();

	const suspendDialog = createDialogState<PersonDto>();

	const query = personDetailQuery(() => personId);
	// created once, asked only once the person exists (a 404 person has no memberships to fetch)
	const membershipsQuery = personMembershipsQuery(() => (query.data ? personId : ''));
	const tenantsQuery = tenantsListQuery();
	const liftMutation = liftGlobalSuspensionMutation();

	type TenantSummary = { slug: string; display_name: string };
	const tenantsById = $derived.by(() => {
		const map = new SvelteMap<string, TenantSummary>();
		for (const t of tenantsQuery.data?.tenants ?? []) {
			map.set(t.id, { slug: t.slug, display_name: t.display_name });
		}
		return map;
	});

	const memberships = $derived(membershipsQuery.data?.memberships ?? []);
	const isPending = $derived(liftMutation.isPending);

	const canManage = $derived(session.can(P.platformUsersManage));

	const enterMutation = enterScopeMutation();

	function liftSuspension(id: string) {
		liftMutation.mutate(id);
	}
	/**
	 * Open a tenant the person belongs to. The tenant's slug goes to the scope POST (the BFF resolves it and
	 * sets the scope cookie), never into the URL bar.
	 */
	function openTenant(slug: string) {
		// a scope change resets everything mounted: unsaved work is asked about first
		if (!confirmLeave()) return;
		// not-a-guard: opens a tenant from a membership row; capabilities only hide manage actions
		enterMutation.mutate({ slug });
	}

	const membershipColumns: DataTableColumn<UserDto>[] = [
		{
			id: 'tenant',
			header: 'Tenant',
			accessor: (m) => tenantsById.get(m.tenant_id)?.display_name ?? m.tenant_id,
			cell: tenantCell,
			primary: true
		},
		{ id: 'designation', header: 'Designation', accessor: (m) => m.designation },
		{ id: 'department', header: 'Department', accessor: (m) => m.department, hideBelow: 'md' },
		{
			id: 'joined',
			header: 'Joined',
			accessor: (m) => formatDate(m.joined_at),
			hideBelow: 'sm',
			class: 'text-muted-foreground tabular-nums'
		},
		{
			id: 'status',
			header: 'Status',
			accessor: (m) => userStatus(m.status).label,
			cell: statusCell
		}
	];
</script>

{#snippet tenantCell(m: UserDto)}
	{@const t = tenantsById.get(m.tenant_id)}
	{#if t}
		<div class="stack stack-tight">
			<span class="text-foreground font-medium">{t.display_name}</span>
			<code class="caption text-muted-foreground">{t.slug}</code>
		</div>
	{:else}
		<code class="caption text-muted-foreground">{m.tenant_id}</code>
	{/if}
{/snippet}

{#snippet statusCell(m: UserDto)}
	{@const membership = userStatus(m.status)}
	<Badge variant={membership.variant} size="sm">{membership.label}</Badge>
{/snippet}

{#snippet membershipActions(m: UserDto)}
	{@const t = tenantsById.get(m.tenant_id)}
	{#if t}
		<Button
			variant="ghost"
			size="sm"
			disabled={enterMutation.isPending}
			onclick={() => openTenant(t.slug)}
			aria-label={`Open tenant ${t.display_name}`}
		>
			<Icon icon={ArrowRight} size="sm" />
		</Button>
	{/if}
{/snippet}

{#snippet empty()}
	<p class="body-base text-muted-foreground">No memberships found.</p>
{/snippet}

<QueryState {query} noun="person" notFound="No person with that ID, or you don't have access.">
	{#snippet skeleton()}
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
	{/snippet}
	{#snippet children(p)}
		{@const badge = personLifecycle(personLifecycleKey(p))}
		{@const displayName = personDisplayName(p)}

		<div class="stack stack-relaxed">
			<!-- Identity card -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Identity</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="stack stack-tight">
						<div class="flex flex-wrap items-center gap-2">
							<IdentityCell name={displayName} subtitle={p.email} />
							<CopyButton value={p.email} label="Copy email" />
							<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
						</div>
						<p class="caption text-subtle-foreground">
							ID <IdChip value={p.id} label="person ID" short={false} />
						</p>
					</div>

					{#if p.is_globally_suspended && p.global_suspension_reason}
						<Alert variant="destructive" class="mt-4">
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
					<DataTable
						columns={membershipColumns}
						data={memberships}
						getRowId={(m) => m.membership_id}
						noun="memberships"
						caption="Memberships"
						query={membershipsQuery}
						rowActions={membershipActions}
						{empty}
					/>
				</Card.Content>
			</Card.Root>

			<!-- No activity card: Go has no per-person audit feed yet (only the caller's own and a tenant's). -->

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
								suspendDialog.show(p);
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
				</Card.Content>
			</Card.Root>
		</div>
	{/snippet}
</QueryState>

<GlobalSuspendDialog
	bind:open={suspendDialog.open}
	person={suspendDialog.target}
	onOpenChange={suspendDialog.onOpenChange}
/>
