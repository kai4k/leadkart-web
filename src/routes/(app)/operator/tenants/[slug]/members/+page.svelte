<script lang="ts">
	/**
	 * Operator — tenant member management.
	 *
	 * Reuses the canonical UsersList component from /settings/users.
	 * The store is loaded via UsersStore.loadForTenant(tenantId) which
	 * injects X-Tenant-Id on the request so the backend scopes the
	 * response to the target tenant (Commit 1 helper).
	 *
	 * Phase A: The full mutating actions (deactivate, role-assign, etc.)
	 * within the UsersList will also need tenant-scoped gateway calls when
	 * the backend enforces operator-on-behalf-of semantics. For now, the
	 * store mutation path uses the caller's own token (operator JWT) —
	 * the backend's operator permission bypass already handles this for
	 * Phase A.
	 */
	import { tenantBySlugQuery } from '$features/operator/tenants/queries';
	import UsersList from '$features/users/components/UsersList.svelte';
	import { Spinner, Alert } from '$ui';

	let { data } = $props();

	const slug = $derived(data.slug);
	const query = $derived(tenantBySlugQuery(slug));
	const tenant = $derived(query.data ?? null);
</script>

<svelte:head>
	<title>{tenant?.display_name ?? 'Tenant'} · Members · LeadKart</title>
</svelte:head>

{#if query.isPending}
	<div class="flex justify-center py-16"><Spinner size={32} /></div>
{:else if query.isError || !tenant}
	<Alert variant="warning" title="Tenant not found">
		No tenant with that ID or slug, or you don't have access.
	</Alert>
{:else}
	<UsersList tenantId={tenant.id} />
{/if}
