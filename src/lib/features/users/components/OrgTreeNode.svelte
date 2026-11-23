<script lang="ts">
	import { Badge } from '$ui';
	import { IdentityCell } from '#lib/components/data/index.ts';
	import { displayName, userStatus } from '$features/auth';
	import { resolve } from '$app/paths';
	import type { OrgNode } from '../view-models-hierarchy';
	import OrgTreeNode from './OrgTreeNode.svelte';

	/**
	 * Recursive org tree row. Each node renders the member card + a
	 * connector line (ASCII-art-equivalent via Tailwind border utilities)
	 * and recurses into children. Cycle-broken nodes get a warning badge
	 * and an aria-label so screen readers don't traverse into a phantom
	 * subtree.
	 */
	type Props = { node: OrgNode };

	let { node }: Props = $props();
	const status = $derived(userStatus(node.user.status));
</script>

<li class="relative">
	<a
		href={resolve('/(app)/settings/users/[id]', { id: node.user.membership_id })}
		class="border-border bg-card hover:border-primary-indicator focus-visible:ring-ring flex items-center gap-3 rounded-md border px-3 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
		aria-label={`${displayName(node.user)}${node.cycleBroken ? ' (cycle detected — review reporting line)' : ''}`}
	>
		<div class="min-w-0 flex-1">
			<IdentityCell
				name={displayName(node.user)}
				subtitle={node.user.designation || node.user.email}
				size="sm"
			/>
		</div>
		<div class="cluster cluster-tight">
			{#if node.cycleBroken}
				<Badge variant="warning" size="sm">Cycle</Badge>
			{/if}
			<Badge variant={status.variant} size="sm">{status.label}</Badge>
		</div>
	</a>

	{#if node.children.length > 0 && !node.cycleBroken}
		<ul class="border-border stack stack-tight ms-6 mt-2 border-s pt-1 ps-4">
			{#each node.children as child (child.user.membership_id)}
				<OrgTreeNode node={child} />
			{/each}
		</ul>
	{/if}
</li>
