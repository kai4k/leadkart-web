<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { _ } from 'svelte-i18n';
	import PageHeader from '$layouts/PageHeader.svelte';
	import { Alert, Badge, Button, Card, CopyButton, Skeleton } from '$ui';
	import { QueryState } from '#lib/components/feedback/index.ts';
	import { Select } from '#lib/components/form/index.ts';
	import {
		roleDetailQuery,
		rolesListQuery,
		updateRoleMutation,
		replaceRolePermissionsMutation,
		setRoleParentMutation,
		PermissionTree,
		RolePropertiesCard,
		roleKind,
		roleKindKey,
		isProtectedRole,
		createRolePermissions,
		unchangeablePermissions,
		PLATFORM_RESERVED
	} from '$features/roles';
	import { describeError } from '$api/errors';
	import { session } from '$features/auth';
	import { isBelowAdminTier, P } from '#lib/features/auth/permissions.ts';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	let { data } = $props();

	let selectedPerms = $state<string[]>([]);
	let error = $state<string | null>(null);
	let saved = $state(false);

	const roleId = $derived(data.roleId);
	// The banner belongs to the role on screen: navigating to another role clears it.
	$effect.pre(() => {
		void roleId;
		error = null;
		saved = false;
	});
	// The page stays mounted across role ids. When the role changes the three mutations are reset
	// (below), so a save of the role the user left reports through the global toast, not a banner
	// for the wrong role; the callbacks here only ever run for the role on screen.
	function bannerFor(fallback: string) {
		return {
			onSuccess: () => {
				saved = true;
			},
			onError: (err: unknown) => {
				error = describeError(err, {
					fallback,
					status: {
						403: "You don't have permission for this action.",
						404: 'This role was deleted or moved.',
						409: 'Conflicts with the current state.'
					}
				});
			}
		};
	}
	const query = roleDetailQuery(() => roleId);
	const role = $derived(query.data ?? null);
	const crumbs = $derived([
		{ label: $_('pages.crumbs.settings') },
		{ href: '/settings/roles', label: $_('nav.items.roles') },
		{ label: role?.name ?? $_('pages.role.fallbackTitle') }
	]);
	const protectedRole = $derived(role ? isProtectedRole(role) : false);

	const may = createRolePermissions();
	const canUpdate = $derived(!protectedRole && may.update);
	// Created once: the role id travels in the mutation variables.
	const updateMutation = updateRoleMutation();
	const replacePermsMutation = replaceRolePermissionsMutation();
	const parentMutation = setRoleParentMutation();
	useResetOnChange(() => roleId, updateMutation, replacePermsMutation, parentMutation);
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
			bannerFor('Failed to update parent.')
		);
	}

	$effect(() => {
		if (role) selectedPerms = [...role.permissions];
	});

	// What Go would refuse per changed name (`authority.mayChangePermissions`), so one such name does not fail the whole
	// save without saying which: a platform-reserved name, and a name the caller does not hold. Inside another tenant
	// an operator acts with what `tenant.admin` implies there (every name that is not platform-reserved), whatever its
	// own list holds. A name the caller's own list holds is never refused here; Go still has the last word.
	const holds = (permission: string): boolean =>
		(session.capabilities?.effective_permissions.includes(permission) ?? false) ||
		(session.inTenantContext && !PLATFORM_RESERVED.has(permission));
	const refusedPermissions = $derived<Record<string, string>>({
		...unchangeablePermissions(holds, {
			reserved: $_('pages.roles.platformReserved'),
			notHeld: $_('pages.roles.notHeld')
		}),
		// A role below the Administrator tier cannot contain `identity.users.create` (Go: admin_tier_required): not offered.
		...(role !== null && isBelowAdminTier(role.hierarchy_level)
			? { [P.identityUsersCreate]: $_('pages.roles.adminTierOnly') }
			: {})
	});
	const permsDirty = $derived.by(() => {
		const r = role;
		if (r === null) return false;
		if (selectedPerms.length !== r.permissions.length) return true;
		return selectedPerms.some((p) => !r.permissions.includes(p));
	});

	// The Properties card reports to the page's one banner.
	const propertiesBanner = bannerFor('Failed to save.');
	function startSave() {
		error = null;
		saved = false;
	}

	function savePerms() {
		if (!role || !canUpdate) return;
		error = null;
		saved = false;

		replacePermsMutation.mutate(
			{ id: role.id, permissions: selectedPerms },
			bannerFor('Failed to save permissions.')
		);
	}
</script>

<svelte:head>
	<title>{plainTitle(role?.name) || 'Role'} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<PageHeader title={role?.name ?? $_('pages.role.fallbackTitle')} {crumbs}>
		{#snippet meta()}
			{#if role}
				{@const badge = roleKind(roleKindKey(role))}
				<Badge variant={badge.variant} size="sm">{badge.label}</Badge>
			{/if}
		{/snippet}
	</PageHeader>

	<QueryState {query} noun="role" notFound="This role doesn't exist or you don't have access.">
		{#snippet skeleton()}
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
		{/snippet}
		{#snippet children(role)}
			<header class="cluster cluster-spread">
				<div class="stack stack-tight">
					<p class="caption text-muted-foreground">Hierarchy level {role.hierarchy_level}</p>
					<div class="cluster cluster-tight">
						<code class="caption text-subtle-foreground">{role.id}</code>
						<CopyButton value={role.id} label="Copy role ID" />
					</div>
				</div>
			</header>

			{#if protectedRole}
				<Alert variant="info"
					>This role is protected by the system. Properties and permissions can't be edited.</Alert
				>
			{/if}
			{#if error}<Alert variant="destructive">{error}</Alert>{/if}
			<!-- The live region is in the page before its content, so the confirmation is announced (a region inserted together with its text often is not). -->
			<div role="status">
				{#if saved}<Alert variant="success" role="none">Saved.</Alert>{/if}
			</div>

			<RolePropertiesCard
				{role}
				{canUpdate}
				busy={isMutating}
				mutation={updateMutation}
				onStart={startSave}
				onSaved={propertiesBanner.onSuccess}
				onFailed={propertiesBanner.onError}
				onBanner={(line) => (error = line)}
			/>

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
						{selectedPerms.length} selected · changes apply atomically on save (PUT replaces the whole
						set).
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<PermissionTree
						selected={selectedPerms}
						disabled={!canUpdate}
						refused={refusedPermissions}
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
		{/snippet}
	</QueryState>
</div>
