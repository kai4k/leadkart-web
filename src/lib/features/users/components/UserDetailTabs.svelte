<script lang="ts">
	import { Avatar, Badge, Button, Card, EmptyState, Tabs } from '$ui';
	import { Edit, Icon, Lock, Shield, UserPlus, Users } from '$icons';
	import type { UserDto } from '$features/users/types';
	import type { RoleDto } from '$features/roles/types';
	import { managerLabel, userRoleBadges, userStatusBadge } from '../view-models';
	import { displayName, initials } from '$features/auth/view-models';
	import { removeManagerMutation } from '../queries';
	import { personActivityQuery } from '$features/audit/queries';
	import ActivityTimeline from '$features/audit/components/ActivityTimeline.svelte';
	import { ApiError } from '$api/errors';
	import { resolve } from '$app/paths';

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

	const status = $derived(userStatusBadge(user.status));
	const userRoles = $derived(userRoleBadges(user, roles));
	const manager = $derived(managerLabel(user, roster));
	const directReports = $derived(roster.filter((u) => u.reports_to === user.membership_id));

	const removeManager = removeManagerMutation();

	const activityQuery = $derived(personActivityQuery(user.person_id));
</script>

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
					<dl class="stack stack-tight body-sm">
						<div class="flex justify-between gap-4">
							<dt class="text-fg-muted">Email</dt>
							<dd class="text-fg truncate">{user.email}</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt class="text-fg-muted">Designation</dt>
							<dd class="text-fg">{user.designation || '—'}</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt class="text-fg-muted">Department</dt>
							<dd class="text-fg">{user.department || '—'}</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt class="text-fg-muted">Status</dt>
							<dd>
								<Badge variant={status.variant} appearance="soft" size="sm">{status.label}</Badge>
							</dd>
						</div>
						<div class="flex justify-between gap-4">
							<dt class="text-fg-muted">Joined</dt>
							<dd class="text-fg tabular-nums">{new Date(user.joined_at).toLocaleDateString()}</dd>
						</div>
						{#if user.left_at}
							<div class="flex justify-between gap-4">
								<dt class="text-fg-muted">Left</dt>
								<dd class="text-fg tabular-nums">{new Date(user.left_at).toLocaleDateString()}</dd>
							</div>
						{/if}
						{#if user.status_message}
							<div class="flex justify-between gap-4">
								<dt class="text-fg-muted">Status message</dt>
								<dd class="text-fg">{user.status_message}</dd>
							</div>
						{/if}
					</dl>
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
								<Icon icon={Users} size="sm" class="text-fg-muted" />
								<span class="body-base text-fg">{manager}</span>
							</div>
							<div class="cluster cluster-tight">
								<Button variant="ghost" size="sm" onclick={onManageManager}>
									<Icon icon={Edit} size="sm" /> Change
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeManager.mutate(user.membership_id)}
								>
									Remove
								</Button>
							</div>
						</div>
					{:else}
						<EmptyState
							icon={Users}
							title="No manager assigned"
							description="Assign a manager so this member appears in the reporting hierarchy."
						>
							{#snippet action()}
								<Button size="sm" onclick={onManageManager}>
									<Icon icon={UserPlus} size="sm" /> Assign manager
								</Button>
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
						<Button size="sm" onclick={onManageRoles}>
							<Icon icon={Shield} size="sm" /> Manage roles
						</Button>
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
									<Badge variant="brand" appearance="soft">
										<Icon icon={Shield} size="xs" />
										{r.name}
									</Badge>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>

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
					<p class="body-sm text-fg-muted">
						Edit overrides via the side panel. Granted permissions extend role defaults; revoked
						permissions remove them even when a role would grant access. Per BRD §6.1:
						<code class="caption text-fg">effective = role + grants − revocations</code>.
					</p>
				</Card.Content>
			</Card.Root>
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
							{@const rs = userStatusBadge(report.status)}
							<li>
								<a
									href={resolve(`/settings/users/${report.membership_id}`)}
									class="hover:bg-bg-muted -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
								>
									<Avatar initials={initials(report)} size="sm" />
									<div class="stack stack-tight min-w-0 flex-1">
										<span class="body-sm text-fg truncate font-medium">
											{displayName(report)}
										</span>
										<span class="caption text-fg-muted truncate">{report.email}</span>
									</div>
									<Badge variant={rs.variant} appearance="soft" size="sm">{rs.label}</Badge>
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
					errorMessage={activityQuery.error instanceof ApiError
						? activityQuery.error.message
						: 'Failed to load activity'}
				/>
			</Card.Content>
		</Card.Root>
	</Tabs.Content>
</Tabs.Root>
