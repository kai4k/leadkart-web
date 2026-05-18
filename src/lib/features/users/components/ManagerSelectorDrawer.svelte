<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { Select } from '$lib/components/form';
	import { users } from '$features/users/stores/users.svelte';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { open = $bindable(false), user, onOpenChange }: Props = $props();

	let selectedManager = $state<string>('');
	let error = $state<string | null>(null);

	$effect(() => {
		if (user) selectedManager = user.reports_to ?? '';
	});

	const eligibleManagers = $derived(
		user
			? users.list.filter((u) => u.membership_id !== user.membership_id && u.status === 'active')
			: []
	);

	async function onSave() {
		if (!user) return;
		error = null;
		try {
			if (selectedManager) {
				await users.assignManager(user.membership_id, selectedManager);
			} else if (user.reports_to) {
				await users.removeManager(user.membership_id);
			}
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update manager';
		}
	}

	const isPending = $derived(users.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Manager for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Used by hierarchy-scoped lists (lead reports, leave approvals) and the org tree.
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
			<Select
				label="Reports to"
				name="manager"
				bind:value={selectedManager}
				options={[
					{ value: '', label: '— No manager —' },
					...eligibleManagers.map((m) => ({ value: m.membership_id, label: displayName(m) }))
				]}
			/>
			{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Save</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
