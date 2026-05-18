<script lang="ts">
	import { Alert, Badge, Breadcrumbs, Button, Card, CopyButton, Spinner } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { TextField } from '$lib/components/form';
	import PermissionTree from '$features/roles/components/PermissionTree.svelte';
	import {
		roleDetailQuery,
		updateRoleMutation,
		replaceRolePermissionsMutation
	} from '$features/roles/queries';
	import { goto } from '$app/navigation';
	import { roleBadgeVariant, isProtectedRole } from '$features/roles/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';

	let { data } = $props();

	let name = $state('');
	let hierarchyLevel = $state(0);
	let selectedPerms = $state<string[]>([]);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const roleId = $derived(data.roleId);
	const query = $derived(roleDetailQuery(roleId));
	const role = $derived(query.data ?? null);
	const breadcrumbs = $derived<BreadcrumbItem[]>([
		{ href: '/settings', label: 'Settings' },
		{ href: '/settings/roles', label: 'Roles' },
		{ label: role?.name ?? 'Role' }
	]);
	const protectedRole = $derived(role ? isProtectedRole(role) : false);
	const capsQuery = myCapabilitiesQuery();

	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.roles.view')) {
			goto('/dashboard', { replaceState: true });
		}
	});

	const canUpdate = $derived(
		!protectedRole && hasCapability(capsQuery.data, 'identity.roles.update')
	);

	const updateMutation = $derived(updateRoleMutation());
	const replacePermsMutation = $derived(replaceRolePermissionsMutation());
	const isMutating = $derived(updateMutation.isPending || replacePermsMutation.isPending);

	$effect(() => {
		if (role) {
			name = role.name;
			hierarchyLevel = role.hierarchy_level;
			selectedPerms = [...role.permissions];
		}
	});

	const metaDirty = $derived(
		role !== null && (name !== role.name || hierarchyLevel !== role.hierarchy_level)
	);
	const permsDirty = $derived(
		role !== null &&
			(selectedPerms.length !== role.permissions.length ||
				selectedPerms.some((p) => !role!.permissions.includes(p)))
	);

	async function saveMeta() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		updateMutation.mutate(
			{ id: role.id, req: { name: name.trim(), hierarchy_level: hierarchyLevel } },
			{
				onSuccess: () => (saved = true),
				onError: (err) => (error = err instanceof Error ? err.message : 'Failed to save')
			}
		);
	}

	async function savePerms() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		replacePermsMutation.mutate(
			{ id: role.id, permissions: selectedPerms },
			{
				onSuccess: () => (saved = true),
				onError: (err) =>
					(error = err instanceof Error ? err.message : 'Failed to save permissions')
			}
		);
	}
</script>

<svelte:head>
	<title>{role?.name ?? 'Role'} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />

	{#if query.isPending}
		<div class="flex justify-center py-16"><Spinner size={32} /></div>
	{:else if query.isError || !role}
		<Alert variant="warning" title="Role not found"
			>This role doesn't exist or you don't have access.</Alert
		>
	{:else}
		{@const badge = roleBadgeVariant(role)}
		<header class="cluster cluster-spread">
			<div class="stack stack-tight">
				<div class="cluster cluster-tight">
					<h1 class="h1">{role.name}</h1>
					<Badge variant={badge.variant} style="soft" size="sm">{badge.label}</Badge>
				</div>
				<p class="caption text-fg-muted">Hierarchy level {role.hierarchy_level}</p>
				<div class="cluster cluster-tight">
					<code class="caption text-fg-subtle">{role.id}</code>
					<CopyButton value={role.id} label="Copy role ID" />
				</div>
			</div>
		</header>

		{#if protectedRole}
			<Alert variant="info"
				>This role is protected by the system. Properties and permissions can't be edited.</Alert
			>
		{/if}
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
		{#if saved}<Alert variant="success">Saved.</Alert>{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title>Properties</Card.Title>
			</Card.Header>
			<Card.Content class="stack stack-relaxed">
				<TextField
					label="Name"
					name="name"
					bind:value={name}
					minlength={3}
					maxlength={100}
					disabled={!canUpdate}
				/>
				<label class="stack stack-tight">
					<span class="label">Hierarchy level</span>
					<input
						type="number"
						bind:value={hierarchyLevel}
						min={0}
						max={100}
						disabled={!canUpdate}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
				</label>
			</Card.Content>
			<Card.Footer>
				<Button
					disabled={!canUpdate || !metaDirty || isMutating}
					loading={isMutating}
					onclick={saveMeta}>Save properties</Button
				>
			</Card.Footer>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Permissions</Card.Title>
				<Card.Description>
					{selectedPerms.length} selected · changes apply atomically on save (PUT replaces the whole set).
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<PermissionTree
					selected={selectedPerms}
					disabled={!canUpdate}
					onChange={(next) => (selectedPerms = next)}
				/>
			</Card.Content>
			<Card.Footer>
				<Button
					disabled={!canUpdate || !permsDirty || isMutating}
					loading={isMutating}
					onclick={savePerms}>Save permissions</Button
				>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
