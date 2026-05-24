<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { Icon, Plus, X } from '$icons';
	import { assignRoleMutation, revokeRoleMutation } from '$features/users/queries';
	import type { UserDto, RoleDto } from '$features/users/types';
	import { canRevokeRole } from '$features/users/view-models';
	import { displayName } from '$features/auth/view-models';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = {
		roleList: RoleDto[];
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { roleList, open = $bindable(false), user, onOpenChange }: Props = $props();

	let bannerError = $state<string | null>(null);

	const assignMutation = assignRoleMutation();
	const revokeMutation = revokeRoleMutation();

	function handleError(err: unknown, mode: 'assign' | 'revoke'): void {
		const verbing = mode === 'assign' ? 'assign' : 'revoke';
		if (err instanceof ValidationError) {
			bannerError = `Couldn't ${verbing} the role — server rejected the request.`;
		} else if (err instanceof ConflictError) {
			bannerError =
				err.detail ||
				(mode === 'assign'
					? 'This role is already assigned.'
					: "This role can't be revoked while it's the user's last permission source.");
		} else if (err instanceof AuthError) {
			bannerError =
				err.status === 403
					? `You don't have permission to ${verbing} roles.`
					: 'Your session expired. Sign in again.';
		} else if (err instanceof NotFoundError) {
			bannerError = 'This role or user no longer exists.';
		} else if (err instanceof NetworkError) {
			bannerError = 'Check your network connection and try again.';
		} else {
			bannerError = `Failed to ${verbing} role. Please try again.`;
		}
	}

	async function onAssign(roleId: string) {
		if (!user) return;
		bannerError = null;
		assignMutation.mutate(
			{ id: user.membership_id, roleId },
			{ onError: (err) => handleError(err, 'assign') }
		);
	}

	async function onRevoke(roleId: string) {
		if (!user) return;
		bannerError = null;
		revokeMutation.mutate(
			{ id: user.membership_id, roleId },
			{ onError: (err) => handleError(err, 'revoke') }
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
									{#if role.is_system_default}<Badge variant="info" appearance="soft" size="sm"
											>System</Badge
										>{/if}
								</div>
								{#if canRevokeRole(role)}
									<Button variant="ghost" size="sm" onclick={() => onRevoke(role.id)}>
										<Icon icon={X} size="sm" /> Revoke
									</Button>
								{:else}
									<Badge variant="warning" appearance="soft" size="sm">Protected</Badge>
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
			{#if bannerError}<Alert class="mt-4" variant="danger">{bannerError}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost">Done</Button>
			</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
