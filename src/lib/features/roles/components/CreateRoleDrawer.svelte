<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import { createRoleMutation } from '$features/roles/queries';
	import { createRoleRequestSchema } from '$features/roles/schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createRoleMutation();
	const form = useForm(
		createRoleRequestSchema,
		{ name: '', hierarchy_level: 5 },
		{ validateOn: 'blur' }
	);

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: () => {
						form.reset();
						onOpenChange(false);
						resolve();
					},
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<Drawer.Root bind:open {onOpenChange}>
	<Drawer.Content>
		<Drawer.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Create role</h2>
				<p class="caption text-fg-muted">
					Permissions can be assigned in the role detail view after creation.
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form id="create-role-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<TextField
					label="Name"
					name="name"
					bind:value={form.values.name}
					minlength={3}
					maxlength={100}
					required
					error={form.errors.name}
					onblur={() => form.validateField('name')}
				/>
				<label class="stack stack-tight">
					<span class="label">Hierarchy level</span>
					<input
						type="number"
						bind:value={form.values.hierarchy_level}
						min={0}
						max={100}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
					<span class="caption text-fg-subtle">
						0 = highest authority. Used for hierarchy-scoped operations (lead reassignment, leave
						approval).
					</span>
				</label>
				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-role-form" loading={form.isSubmitting}>Create role</Button>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
