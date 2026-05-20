<script lang="ts">
	import { rolesListQuery } from '$features/roles/queries';
	import { Badge, Card, EmptyState, Spinner, Alert } from '$ui';
	import { Shield } from '$icons';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	const rolesQuery = rolesListQuery();
	const roles = $derived(rolesQuery.data?.roles ?? []);
</script>

<svelte:head><title>Roles · {data.tenant.display_name} · LeadKart</title></svelte:head>

{#if rolesQuery.isPending}
	<div class="flex justify-center py-8"><Spinner size={28} /></div>
{:else if rolesQuery.isError}
	<Alert variant="danger" title="Failed to load roles">
		{rolesQuery.error instanceof Error ? rolesQuery.error.message : 'Unknown error'}
	</Alert>
{:else if roles.length === 0}
	<EmptyState icon={Shield} title="No roles" description="This tenant has no custom roles yet." />
{:else}
	<ul class="stack stack-tight" aria-label="Tenant roles">
		{#each roles as role (role.id)}
			<li>
				<Card.Root>
					<Card.Content class="cluster cluster-spread items-center">
						<div class="stack stack-tight">
							<div class="cluster cluster-tight">
								<p class="h5 text-fg">{role.name}</p>
								{#if role.is_system_default}
									<Badge variant="neutral" style="soft" size="sm">System</Badge>
								{/if}
								{#if role.is_super_admin}
									<Badge variant="brand" style="soft" size="sm">Super admin</Badge>
								{/if}
							</div>
							<p class="caption text-fg-muted">
								Level {role.hierarchy_level} · {role.permissions.length} permissions
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</li>
		{/each}
	</ul>
{/if}
