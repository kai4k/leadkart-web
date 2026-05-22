<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { Select } from '$lib/components/form';
	import { assignManagerMutation, removeManagerMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth/view-models';

	type Props = {
		userList: UserDto[];
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { userList, open = $bindable(false), user, onOpenChange }: Props = $props();

	let selectedManager = $state<string>('');
	let error = $state<string | null>(null);

	$effect(() => {
		if (user) selectedManager = user.reports_to ?? '';
	});

	const eligibleManagers = $derived(
		user
			? userList.filter((u) => u.membership_id !== user.membership_id && u.status === 'active')
			: []
	);

	const assignMutation = assignManagerMutation();
	const removeMutation = removeManagerMutation();

	const isPending = $derived(assignMutation.isPending || removeMutation.isPending);

	async function onSave() {
		if (!user) return;
		error = null;
		if (selectedManager) {
			assignMutation.mutate(
				{ id: user.membership_id, managerId: selectedManager },
				{
					onSuccess: () => onOpenChange(false),
					onError: (err) =>
						(error = err instanceof Error ? err.message : 'Failed to update manager')
				}
			);
		} else if (user.reports_to) {
			removeMutation.mutate(user.membership_id, {
				onSuccess: () => onOpenChange(false),
				onError: (err) => (error = err instanceof Error ? err.message : 'Failed to remove manager')
			});
		} else {
			onOpenChange(false);
		}
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Manager for {user ? displayName(user) : 'user'}</h2>
				<p class="caption text-fg-muted">
					Used by hierarchy-scoped lists (lead reports, leave approvals) and the org tree.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
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
