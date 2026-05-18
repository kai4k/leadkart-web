<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import { roles } from '$features/roles/stores/roles.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	let name = $state('');
	let hierarchyLevel = $state(5);
	let error = $state<string | null>(null);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		try {
			await roles.create({ name: name.trim(), hierarchy_level: hierarchyLevel });
			name = '';
			hierarchyLevel = 5;
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create role';
		}
	}

	const isPending = $derived(roles.status === 'mutating');
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Create role</h2>
				<p class="caption text-[var(--color-fg-muted)]">
					Permissions can be assigned in the role detail view after creation.
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
			<form id="create-role-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Name"
					name="name"
					bind:value={name}
					minlength={3}
					maxlength={100}
					required
				/>
				<label class="stack stack-tight">
					<span class="label">Hierarchy level</span>
					<input
						type="number"
						bind:value={hierarchyLevel}
						min={0}
						max={100}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
					<span class="caption text-[var(--color-fg-subtle)]">
						0 = highest authority. Used for hierarchy-scoped operations (lead reassignment, leave
						approval).
					</span>
				</label>
				{#if error}<Alert variant="danger">{error}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-role-form" loading={isPending}>Create role</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
