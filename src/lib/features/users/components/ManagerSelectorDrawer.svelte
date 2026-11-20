<script lang="ts">
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';
	import { Drawer, Button, Alert } from '$ui';
	import { Select } from '#lib/components/form/index.ts';
	import { assignManagerMutation, removeManagerMutation } from '$features/users/queries';
	import type { UserDto } from '$features/users/types';
	import { displayName } from '$features/auth';
	import { ValidationError, describeError } from '$api/errors';

	type Props = {
		userList: UserDto[];
		open: boolean;
		user: UserDto | null;
		onOpenChange: (open: boolean) => void;
	};

	let { userList, open = $bindable(false), user, onOpenChange }: Props = $props();

	let selectedManager = $state<string>('');
	let bannerError = $state<string | null>(null);
	let fieldError = $state<string | null>(null);

	$effect(() => {
		if (user) selectedManager = user.reports_to ?? '';
	});

	const eligibleManagers = $derived(
		user
			? userList.filter((u) => u.membership_id !== user.membership_id && u.status === 'active')
			: []
	);

	const assignMutation = assignManagerMutation();
	const removeMutation = removeManagerMutation({ inlineErrors: true });
	// The component outlives the surface: detach the observer(s) when it opens or closes, so a late failure toasts.
	useResetOnChange(() => open, assignMutation, removeMutation);

	const isPending = $derived(assignMutation.isPending || removeMutation.isPending);

	function handleError(err: unknown, fallback: string): void {
		const fieldMessage =
			err instanceof ValidationError ? (err.fields.manager_id ?? err.fields.reports_to) : undefined;
		if (fieldMessage) {
			fieldError = fieldMessage;
			bannerError = null;
			return;
		}
		bannerError = describeError(err, {
			fallback,
			status: {
				403: "You don't have permission to change this user's manager.",
				404: 'This user was deleted or moved.',
				409: 'This manager assignment conflicts with an existing one.'
			}
		});
	}

	async function onSave() {
		if (!user) return;
		bannerError = null;
		fieldError = null;
		if (selectedManager) {
			assignMutation.mutate(
				{ id: user.membership_id, managerId: selectedManager },
				{
					onSuccess: () => onOpenChange(false),
					onError: (err) => handleError(err, 'Failed to update manager.')
				}
			);
		} else if (user.reports_to) {
			removeMutation.mutate(user.membership_id, {
				onSuccess: () => onOpenChange(false),
				onError: (err) => handleError(err, 'Failed to remove manager.')
			});
		} else {
			onOpenChange(false);
		}
	}
</script>

<Drawer.Root bind:open busy={isPending} {onOpenChange}>
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
				error={fieldError ?? undefined}
				options={[
					{ value: '', label: '— No manager —' },
					...eligibleManagers.map((m) => ({ value: m.membership_id, label: displayName(m) }))
				]}
			/>
			{#if bannerError}<Alert class="mt-4" variant="destructive">{bannerError}</Alert>{/if}
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button loading={isPending} onclick={onSave}>Save</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
