<script lang="ts">
	import { Breadcrumbs, Card, EmptyState, Skeleton, type BreadcrumbItem } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { Users } from '$icons';
	import { usersListQuery } from '$features/users/queries';
	import { buildOrgTree } from '$features/users/view-models-hierarchy';
	import { OrgTreeNode, UsersTruncatedAlert } from '$features/users';

	/**
	 * Org chart — renders the tenant's reporting structure as a tree
	 * of OrgTreeNode rows. Built from the same UserDto[] the list page
	 * uses; recursive composition keeps deep hierarchies readable.
	 *
	 * Per BRD §6.7: single-parent reporting, ReportsTo nullable, recursive
	 * subordinate visibility. The tree mirrors that structure exactly.
	 */

	const listQuery = usersListQuery();
	const users = $derived(listQuery.data ?? []);
	const tree = $derived(buildOrgTree(users));

	const breadcrumbs: BreadcrumbItem[] = [
		{ label: 'Settings' },
		{ href: '/settings/users', label: 'Team' },
		{ label: 'Hierarchy' }
	];
</script>

<svelte:head>
	<title>Hierarchy · Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	<header class="stack stack-tight">
		<h1 class="h1">Reporting hierarchy</h1>
		<p class="body-sm text-fg-muted">
			Who reports to whom. Each member can have at most one manager — the line of authority used for
			task visibility and management chains.
		</p>
	</header>

	<UsersTruncatedAlert count={users.length} />

	<QueryState query={listQuery} noun="members" isEmpty={(members) => members.length === 0}>
		{#snippet skeleton()}
			<Skeleton class="h-10 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
		{/snippet}
		{#snippet empty()}
			<Card.Root padding="md" elevation="sm">
				<EmptyState
					icon={Users}
					title="No members yet"
					description="Invite your first member to start building the reporting hierarchy."
				/>
			</Card.Root>
		{/snippet}
		<Card.Root padding="md" elevation="sm">
			<Card.Header>
				<Card.Title>{tree.totalMembers} members</Card.Title>
				<Card.Description>
					Top-level members (no manager assigned) appear at the root. Click any row to open that
					member's profile.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<ul class="stack" aria-label="Reporting hierarchy">
					{#each tree.roots as root (root.user.membership_id)}
						<OrgTreeNode node={root} />
					{/each}
				</ul>

				{#if tree.orphans.length > 0}
					<div class="border-border mt-6 border-t pt-4">
						<p class="label text-warning-700 mb-2">
							{tree.orphans.length} orphaned member{tree.orphans.length === 1 ? '' : 's'}
						</p>
						<p class="caption text-fg-muted mb-3">
							These members reference a manager that doesn't exist in the current tenant (usually a
							deactivated or deleted member). Reassign their reporting line.
						</p>
						<ul class="stack" aria-label="Orphaned members">
							{#each tree.orphans as orphan (orphan.user.membership_id)}
								<OrgTreeNode node={orphan} />
							{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</QueryState>
</div>
