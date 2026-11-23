<script lang="ts">
	import { Badge, Button, Card, DescriptionList, EmptyState, Tabs } from '$ui';
	import { Edit, Icon, Lock, Shield, UserPlus, Users } from '$icons';
	import type { UserDto } from '$features/users/types';
	import type { RoleDto } from '$features/roles/types';
	import { managerLabel, userRoleBadges } from '../view-models';
	import { displayName, userStatus } from '$features/auth';
	import { IdentityCell } from '#lib/components/data/index.ts';
	import { removeManagerMutation } from '../queries';
	import { personActivityQuery, ActivityTimeline } from '$features/audit';
	import { describeError } from '$api/errors';
	import { formatDate } from '#lib/utils/format.ts';
	import { resolve } from '$app/paths';
	import { createMemberPermissions } from '../member-permissions.svelte.ts';

	/**
	 * UserDetailTabs — render-only sub-component for the dedicated
	 * user-detail page. Owns the Overview / Roles & permissions /
	 * Reports tabs. Page hosts the dialogs + action menu; this
	 * component is pure projection over UserDto + roster.
	 */
	type Props = {
		user: UserDto;
		roster: ReadonlyArray<UserDto>;
		roles: ReadonlyArray<RoleDto>;
		tab: string;
		onTabChange: (name: string) => void;
		onManageRoles: () => void;
		onManageManager: () => void;
		onManagePerms: () => void;
	};

	let {
		user,
		roster,
		roles,
		tab,
		onTabChange,
		onManageRoles,
		onManageManager,
		onManagePerms
	}: Props = $props();

	const status = $derived(userStatus(user.status));
	const userRoles = $derived(userRoleBadges(user, roles));
	const manager = $derived(managerLabel(user, roster));
	const directReports = $derived(roster.filter((u) => u.reports_to === user.membership_id));

	const removeManager = removeManagerMutation();
	const may = createMemberPermissions();

	const activityQuery = personActivityQuery(() => user.person_id);
</script>

{#snippet statusBadge()}
	<Badge variant={status.variant} size="sm">{status.label}</Badge>
{/snippet}

<Tabs.Root value={tab} onValueChange={onTabChange}>
	<Tabs.List>
		<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
		<Tabs.Trigger value="permissions">Roles & permissions</Tabs.Trigger>
		<Tabs.Trigger value="reports">Reports</Tabs.Trigger>
		<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="overview">
		<div class="grid grid-cols-1 gap-4 pt-4 lg:grid-cols-2">
			<Card.Root padding="md" elevation="sm">
				<Card.Header>
					<Card.Title>Identity</Card.Title>
				</Card.Header>
				<Card.Content>
					<DescriptionList
						items={[
							{ label: 'Email', value: user.email, span: 2 },
							{ label: 'Designation', value: user.designation },
							{ label: 'Department', value: user.department },
							{ label: 'Status', render: statusBadge },
							{ label: 'Joined', value: formatDate(user.joined_at) },
							...(user.left_at ? [{ label: 'Left', value: formatDate(user.left_at) }] : []),
							...(user.status_message
								? [{ label: 'Status message', value: user.status_message, span: 2 as const }]
								: [])
						]}
					/>
				</Card.Content>
			</Card.Root>

			<Card.Root padding="md" elevation="sm">
				<Card.Header>
					<Card.Title>Reporting line</Card.Title>
					<Card.Description>Who this member reports to.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if manager}
						<div class="cluster cluster-spread">
							<div class="cluster cluster-tight">
								<Icon icon={Users} size="sm" class="text-muted-foreground" />
								<span class="body-base text-foreground">{manager}</span>
							</div>
							{#if may.update}
								<div class="cluster cluster-tight">
									<Button variant="ghost" size="sm" onclick={onManageManager}
										><Icon icon={Edit} size="sm" /> Change</Button
									>

									<Button
										variant="ghost"
										size="sm"
										loading={removeManager.isPending}
										disabled={removeManager.isPending}
										onclick={() => {
											if (!removeManager.isPending) removeManager.mutate(user.membership_id);
										}}
									>
										Remove
									</Button>
								</div>
							{/if}
						</div>
					{:else}
						<EmptyState
							icon={Users}
							title="No manager assigned"
							description="Assign a manager so this member appears in the reporting hierarchy."
						>
							{#snippet action()}
								{#if may.update}
									<Button size="sm" onclick={onManageManager}>
										<Icon icon={UserPlus} size="sm" /> Assign manager
									</Button>
								{/if}
							{/snippet}
						</EmptyState>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</Tabs.Content>

	<Tabs.Content value="permissions">
		<div class="stack stack-relaxed pt-4">
			<Card.Root padding="md" elevation="sm">
				<Card.Header>
					<div class="cluster cluster-spread">
						<div class="stack stack-tight">
							<Card.Title>Roles</Card.Title>
							<Card.Description>
								Effective permissions = role defaults + user grants − user revocations.
							</Card.Description>
						</div>
						{#if may.manageRoles}
							<Button size="sm" onclick={onManageRoles}>
								<Icon icon={Shield} size="sm" /> Manage roles
							</Button>
						{/if}
					</div>
				</Card.Header>
				<Card.Content>
					{#if userRoles.length === 0}
						<EmptyState
							title="No roles assigned"
							description="Assign a role to grant permissions."
						/>
					{:else}
						<ul class="cluster">
							{#each userRoles as r (r.id)}
								<li>
									<Badge variant="brand">
										<Icon icon={Shield} size="xs" />
										{r.name}
									</Badge>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Not offered while `may.overrides` is off (member-permissions.svelte.ts says what it waits for): a card
			     that points at a side panel nobody can open would not be true. -->
			{#if may.overrides}
				<Card.Root padding="md" elevation="sm">
					<Card.Header>
						<div class="cluster cluster-spread">
							<div class="stack stack-tight">
								<Card.Title>Permission overrides</Card.Title>
								<Card.Description>
									Per-user grants and revocations layered on top of role defaults.
								</Card.Description>
							</div>
							<Button size="sm" variant="tonal" onclick={onManagePerms}>
								<Icon icon={Lock} size="sm" /> Edit overrides
							</Button>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="body-sm text-muted-foreground">
							Edit overrides via the side panel. Granted permissions extend role defaults; revoked
							permissions remove them even when a role would grant access. Per BRD §6.1:
							<code class="caption text-foreground">effective = role + grants − revocations</code>.
						</p>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</Tabs.Content>

	<Tabs.Content value="reports">
		<Card.Root padding="md" elevation="sm" class="mt-4">
			<Card.Header>
				<Card.Title>Direct reports</Card.Title>
				<Card.Description>
					{directReports.length} member{directReports.length === 1 ? '' : 's'} report directly to
					{displayName(user)}.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if directReports.length === 0}
					<EmptyState
						icon={Users}
						title="No direct reports"
						description="Assign this member as a manager from another member's profile to populate this list."
					/>
				{:else}
					<ul class="stack stack-tight">
						{#each directReports as report (report.membership_id)}
							{@const rs = userStatus(report.status)}
							<li>
								<a
									href={resolve('/(app)/settings/users/[id]', { id: report.membership_id })}
									class="hover:bg-muted -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
								>
									<div class="min-w-0 flex-1">
										<IdentityCell name={displayName(report)} subtitle={report.email} size="sm" />
									</div>
									<Badge variant={rs.variant} size="sm">{rs.label}</Badge>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</Tabs.Content>

	<Tabs.Content value="activity">
		<Card.Root padding="md" elevation="sm" class="mt-4">
			<Card.Header>
				<Card.Title>Activity log</Card.Title>
				<Card.Description>
					Audit events for this person across all tenants. Includes sign-ins, role changes, profile
					updates, and lifecycle transitions.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<ActivityTimeline
					data={activityQuery.data}
					isPending={activityQuery.isPending}
					isError={activityQuery.isError}
					errorMessage={describeError(activityQuery.error, { fallback: 'Failed to load activity' })}
				/>
			</Card.Content>
		</Card.Root>
	</Tabs.Content>
</Tabs.Root>
