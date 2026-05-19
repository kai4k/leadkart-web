<script lang="ts">
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import { rolesScopedListQuery } from '$features/roles/queries';
	import { Badge, Card, EmptyState, Spinner, Alert } from '$ui';
	import { Shield } from '$icons';

	let { data } = $props();

	const slug = $derived(data.slug);
	const tenantQuery = $derived(tenantBySlugQuery(slug));
	const tenantId = $derived(tenantQuery.data?.id ?? '');

	const rolesQuery = $derived(tenantId ? rolesScopedListQuery(tenantId) : null);
	const roles = $derived(rolesQuery?.data?.roles ?? []);
</script>

<svelte:head><title>Roles · LeadKart</title></svelte:head>

{#if tenantQuery.isPending}
	<div class="flex justify-center py-8"><Spinner size={28} /></div>
{:else if tenantQuery.isError || !tenantId}
	<Alert variant="warning" title="Tenant not found">Could not load tenant context.</Alert>
{:else if rolesQuery?.isPending}
	<div class="flex justify-center py-8"><Spinner size={28} /></div>
{:else if rolesQuery?.isError}
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
