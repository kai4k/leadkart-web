<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { replacePermissionOverridesMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let granted = $state<string[]>([]);
	let revoked = $state<string[]>([]);
	let bannerError = $state<string | null>(null);
	let grantedError = $state<string | null>(null);
	let revokedError = $state<string | null>(null);

	$effect(() => {
		// V1: no backend endpoint returns the existing overrides per
		// user; we manage them blind. Future GET /users/{id} should
		// include grant/revoke arrays — until then this UI is grant-only-on-save.
		granted = [];
		revoked = [];
	});

	let newGrant = $state('');
	let newRevoke = $state('');

	const mutation = replacePermissionOverridesMutation();
	const isPending = $derived(mutation.isPending);

	function addGrant() {
		const name = newGrant.trim();
		if (name && !granted.includes(name)) granted = [...granted, name];
		newGrant = '';
	}

	function addRevoke() {
		const name = newRevoke.trim();
		if (name && !revoked.includes(name)) revoked = [...revoked, name];
		newRevoke = '';
	}

	function removeGrant(name: string) {
		granted = granted.filter((n) => n !== name);
	}

	function removeRevoke(name: string) {
		revoked = revoked.filter((n) => n !== name);
	}

	async function onSave() {
		if (!user) return;
		bannerError = null;
		grantedError = null;
		revokedError = null;
		mutation.mutate(
			{ id: user.membership_id, body: { granted, revoked } },
			{
				onSuccess: () => onOpenChange(false),
				onError: (err) => {
					if (err instanceof ValidationError) {
						grantedError = err.fields.granted ?? null;
						revokedError = err.fields.revoked ?? null;
						bannerError =
							grantedError || revokedError ? null : 'One or more permission names are invalid.';
					} else if (err instanceof ConflictError) {
						bannerError = err.detail || 'These overrides conflict with the current role set.';
					} else if (err instanceof AuthError) {
						bannerError =
							err.status === 403
								? "You don't have permission to manage permission overrides."
								: 'Your session expired. Sign in again.';
					} else if (err instanceof NotFoundError) {
						bannerError = 'This user was deleted or moved.';
					} else if (err instanceof NetworkError) {
						bannerError = 'Check your network connection and try again.';
					} else {
						bannerError = 'Failed to save overrides. Please try again.';
					}
				}
			}
		);
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Permission overrides for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-fg-muted">
					Atomic replace: this exact set of grants and revokes overlays on top of role-default
					permissions. Empty arrays clear the overlay.
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
				<h3 class="overline">Extra grants</h3>
				<div class="cluster">
					<input
						class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
						placeholder="e.g. crm.leads.reassign"
						aria-invalid={grantedError ? 'true' : undefined}
						bind:value={newGrant}
					/>
					<Button variant="ghost" onclick={addGrant}>Add</Button>
				</div>
				{#if grantedError}<span class="body-sm text-danger-700">{grantedError}</span>{/if}
				{#if granted.length > 0}
					<ul class="cluster" aria-label="Granted permissions">
						{#each granted as p (p)}
							<li>
								<Badge variant="success" appearance="soft" size="sm"
									>{p}
									<button
										type="button"
										class="ml-1"
										onclick={() => removeGrant(p)}
										aria-label="Remove">×</button
									>
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			<section class="stack stack-tight">
				<h3 class="overline">Revocations</h3>
				<div class="cluster">
					<input
						class="glass-input flex-1 rounded-md px-3 py-2 text-sm"
						placeholder="e.g. crm.leads.delete"
						aria-invalid={revokedError ? 'true' : undefined}
						bind:value={newRevoke}
					/>
					<Button variant="ghost" onclick={addRevoke}>Add</Button>
				</div>
				{#if revokedError}<span class="body-sm text-danger-700">{revokedError}</span>{/if}
				{#if revoked.length > 0}
					<ul class="cluster" aria-label="Revoked permissions">
						{#each revoked as p (p)}
							<li>
								<Badge variant="danger" appearance="soft" size="sm"
									>{p}
									<button
										type="button"
										class="ml-1"
										onclick={() => removeRevoke(p)}
										aria-label="Remove">×</button
									>
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if bannerError}<Alert class="mt-4" variant="danger">{bannerError}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Apply overrides</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
