<script lang="ts">
	import { Alert, Badge, Breadcrumbs, Button, Card, CopyButton, Skeleton } from '$ui';
	import type { BreadcrumbItem } from '$ui';
	import { Select, TextField } from '$lib/components/form';
	import PermissionTree from '$features/roles/components/PermissionTree.svelte';
	import {
		roleDetailQuery,
		rolesListQuery,
		updateRoleMutation,
		replaceRolePermissionsMutation,
		setRoleParentMutation
	} from '$features/roles/queries';
	import { goto } from '$app/navigation';
	import { roleBadgeVariant, isProtectedRole } from '$features/roles/view-models';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	let { data } = $props();

	let name = $state('');
	let hierarchyLevel = $state(0);
	let selectedPerms = $state<string[]>([]);
	let error = $state<string | null>(null);
	let saved = $state(false);

	function describeError(err: unknown, fallback: string): string {
		if (err instanceof ValidationError) {
			// Surface the first per-field message in this composite form.
			const first = Object.values(err.fields)[0];
			return first ?? fallback;
		}
		if (err instanceof ConflictError) return err.detail || 'Conflicts with the current state.';
		if (err instanceof AuthError)
			return err.status === 403
				? "You don't have permission for this action."
				: 'Your session expired. Sign in again.';
		if (err instanceof NotFoundError) return 'This role was deleted or moved.';
		if (err instanceof NetworkError) return 'Check your network connection and try again.';
		return fallback;
	}

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
	const parentMutation = $derived(setRoleParentMutation());
	const isMutating = $derived(
		updateMutation.isPending || replacePermsMutation.isPending || parentMutation.isPending
	);

	// All roles in the tenant — for the parent picker. Exclude self and
	// protected roles (server rejects parenting either way).
	const rolesQuery = rolesListQuery();
	const parentCandidates = $derived(
		(rolesQuery.data?.roles ?? []).filter(
			(r) => r.id !== roleId && !r.is_system_default && !r.is_super_admin
		)
	);

	let selectedParent = $state('');
	$effect(() => {
		if (role) selectedParent = role.parent_role_id ?? '';
	});

	const parentDirty = $derived(role !== null && selectedParent !== (role.parent_role_id ?? ''));

	function saveParent() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		parentMutation.mutate(
			{ id: role.id, parent_role_id: selectedParent || null },
			{
				onSuccess: () => (saved = true),
				onError: (err: unknown) => (error = describeError(err, 'Failed to update parent.'))
			}
		);
	}

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
	const permsDirty = $derived.by(() => {
		const r = role;
		if (r === null) return false;
		if (selectedPerms.length !== r.permissions.length) return true;
		return selectedPerms.some((p) => !r.permissions.includes(p));
	});

	function saveMeta() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		updateMutation.mutate(
			{ id: role.id, req: { name: name.trim(), hierarchy_level: hierarchyLevel } },
			{
				onSuccess: () => (saved = true),
				onError: (err) => (error = describeError(err, 'Failed to save.'))
			}
		);
	}

	function savePerms() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;
		replacePermsMutation.mutate(
			{ id: role.id, permissions: selectedPerms },
			{
				onSuccess: () => (saved = true),
				onError: (err) => (error = describeError(err, 'Failed to save permissions.'))
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
		<div class="stack stack-relaxed" aria-busy="true" aria-label="Loading role">
			<Skeleton class="h-7 w-1/3" />
			<Skeleton class="h-3 w-1/4" />
			<Card.Root>
				<Card.Content>
					<Skeleton class="h-40 w-full rounded-md" />
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Content>
					<Skeleton class="h-64 w-full rounded-md" />
				</Card.Content>
			</Card.Root>
		</div>
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
					<Badge variant={badge.variant} appearance="soft" size="sm">{badge.label}</Badge>
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
						class="bg-bg-elevated border border-border rounded-md rounded-md px-3 py-2 text-sm"
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
				<Card.Title>Organizational hierarchy</Card.Title>
				<Card.Description
					>Optional parent role for the org-tree (single-parent per ADR 0054). Used by
					hierarchy-scoped lists + permission inheritance audits.</Card.Description
				>
			</Card.Header>
			<Card.Content class="stack stack-relaxed">
				<Select
					label="Parent role"
					name="parent_role_id"
					bind:value={selectedParent}
					disabled={!canUpdate}
					options={[
						{ value: '', label: '— No parent —' },
						...parentCandidates.map((r) => ({ value: r.id, label: r.name }))
					]}
				/>
			</Card.Content>
			<Card.Footer>
				<Button
					disabled={!canUpdate || !parentDirty || isMutating}
					loading={parentMutation.isPending}
					onclick={saveParent}>Save parent</Button
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
