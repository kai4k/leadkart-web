<script lang="ts">
	import { goto } from '$app/navigation';
	import { Alert, Breadcrumbs, Card, EmptyState, Skeleton } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { Users } from '$icons';
	import { usersListQuery } from '$features/users/queries';
	import { buildOrgTree } from '$features/users/view-models-hierarchy';
	import OrgTreeNode from '$features/users/components/OrgTreeNode.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	/**
	 * Org chart — renders the tenant's reporting structure as a tree
	 * of OrgTreeNode rows. Built from the same UserDto[] the list page
	 * uses; recursive composition keeps deep hierarchies readable.
	 *
	 * Per BRD §6.7: single-parent reporting, ReportsTo nullable, recursive
	 * subordinate visibility. The tree mirrors that structure exactly.
	 */

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.users.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	const listQuery = usersListQuery();
	const users = $derived(listQuery.data?.users ?? []);
	const tree = $derived(buildOrgTree(users));

	const breadcrumbs: BreadcrumbItem[] = [
		{ href: '/settings', label: 'Settings' },
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

	{#if listQuery.isPending}
		<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading hierarchy">
			<Skeleton class="h-10 w-1/3" />
			<Skeleton class="h-32 w-full rounded-md" />
		</div>
	{:else if listQuery.isError}
		<Alert variant="danger" title="Could not load members">
			Refresh the page or try again in a moment.
		</Alert>
	{:else if users.length === 0}
		<Card.Root padding="md" elevation="sm">
			<EmptyState
				icon={Users}
				title="No members yet"
				description="Invite your first member to start building the reporting hierarchy."
			/>
		</Card.Root>
	{:else}
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
	{/if}
</div>
