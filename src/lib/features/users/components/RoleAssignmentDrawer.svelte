<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { Icon, Plus, X } from '$icons';
	import { assignRoleMutation, revokeRoleMutation } from '$features/users/queries';
	import type { UserDto, RoleDto } from '$features/users/types';
	import { canRevokeRole } from '$features/users/view-models';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		roleList: RoleDto[];
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { roleList, open = $bindable(false), user, onOpenChange }: Props = $props();

	let error = $state<string | null>(null);

	const assignMutation = assignRoleMutation();
	const revokeMutation = revokeRoleMutation();

	async function onAssign(roleId: string) {
		if (!user) return;
		error = null;
		assignMutation.mutate(
			{ id: user.membership_id, roleId },
			{ onError: (err) => (error = err instanceof Error ? err.message : 'Failed to assign role') }
		);
	}

	async function onRevoke(roleId: string) {
		if (!user) return;
		error = null;
		revokeMutation.mutate(
			{ id: user.membership_id, roleId },
			{ onError: (err) => (error = err instanceof Error ? err.message : 'Failed to revoke role') }
		);
	}

	const assignedRoles = $derived(user ? roleList.filter((r) => user.role_ids.includes(r.id)) : []);
	const availableRoles = $derived(
		user ? roleList.filter((r) => !user.role_ids.includes(r.id)) : []
	);
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Roles for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-fg-muted">
					Assignments are immediate. Each role contributes its default permissions; user-level
					grants/revokes overlay on top.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<section class="stack stack-tight mb-6">
				<h3 class="overline">Assigned</h3>
				{#if assignedRoles.length === 0}
					<p class="body-sm text-fg-muted">No roles assigned.</p>
				{:else}
					<ul class="stack stack-tight" aria-label="Assigned roles">
						{#each assignedRoles as role (role.id)}
							<li class="cluster cluster-spread border-border rounded-md border px-3 py-2">
								<div class="stack stack-tight">
									<span class="label">{role.name}</span>
									{#if role.is_system_default}<Badge variant="info" style="soft" size="sm"
											>System</Badge
										>{/if}
								</div>
								{#if canRevokeRole(role)}
									<Button variant="ghost" size="sm" onclick={() => onRevoke(role.id)}>
										<Icon icon={X} size="sm" /> Revoke
									</Button>
								{:else}
									<Badge variant="warning" style="soft" size="sm">Protected</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			<section class="stack stack-tight">
				<h3 class="overline">Available</h3>
				{#if availableRoles.length === 0}
					<p class="body-sm text-fg-muted">All catalogue roles already assigned.</p>
				{:else}
					<ul class="stack stack-tight" aria-label="Available roles">
						{#each availableRoles as role (role.id)}
							<li class="cluster cluster-spread border-border rounded-md border px-3 py-2">
								<span class="label">{role.name}</span>
								<Button variant="ghost" size="sm" onclick={() => onAssign(role.id)}>
									<Icon icon={Plus} size="sm" /> Assign
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost">Done</Button>
			</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
