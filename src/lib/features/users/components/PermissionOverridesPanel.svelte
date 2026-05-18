<script lang="ts">
	import { Drawer, Button, Badge, Alert } from '$ui';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let granted = $state<string[]>([]);
	let revoked = $state<string[]>([]);
	let error = $state<string | null>(null);

	$effect(() => {
		// V1: no backend endpoint returns the existing overrides per
		// user; we manage them blind. Future GET /users/{id} should
		// include grant/revoke arrays — until then this UI is grant-only-on-save.
		granted = [];
		revoked = [];
	});

	let newGrant = $state('');
	let newRevoke = $state('');

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
		error = null;
		try {
			await users.replacePermissionOverrides(user.membership_id, { granted, revoked });
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save overrides';
		}
	}

	const isPending = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Permission overrides for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Atomic replace: this exact set of grants and revokes overlays on top of role-default
					permissions. Empty arrays clear the overlay.
				</p>
			</div>
			<Drawer.Close>
				<button
					type="button"
					class="rounded-md p-1.5 hover:bg-[var(--color-bg-muted)]"
					aria-label="Close">×</button
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
						bind:value={newGrant}
					/>
					<Button variant="ghost" onclick={addGrant}>Add</Button>
				</div>
				{#if granted.length > 0}
					<ul class="cluster" aria-label="Granted permissions">
						{#each granted as p (p)}
							<li>
								<Badge variant="success" style="soft" size="sm"
									>{p}
									<button class="ml-1" onclick={() => removeGrant(p)} aria-label="Remove">×</button>
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
						bind:value={newRevoke}
					/>
					<Button variant="ghost" onclick={addRevoke}>Add</Button>
				</div>
				{#if revoked.length > 0}
					<ul class="cluster" aria-label="Revoked permissions">
						{#each revoked as p (p)}
							<li>
								<Badge variant="danger" style="soft" size="sm"
									>{p}
									<button class="ml-1" onclick={() => removeRevoke(p)} aria-label="Remove">×</button
									>
								</Badge>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Apply overrides</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
