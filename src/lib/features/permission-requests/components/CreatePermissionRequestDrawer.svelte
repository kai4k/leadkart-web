<script lang="ts">
	import { Drawer, Button, Alert } from '$ui';
	import { TextField } from '$lib/components/form';
	import { createPermissionRequestMutation } from '$features/permission-requests/queries';
	import { createPermissionRequestSchema } from '$features/permission-requests/schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';

	type Props = { open: boolean; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = createPermissionRequestMutation();
	const form = useForm(
		createPermissionRequestSchema,
		{ permission: '', duration_days: 30, reason: '' },
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
				<h2 class="h4">Request permission</h2>
				<p class="caption text-fg-muted">
					Time-bound elevation. Routes to your manager (or a Platform operator if you have none).
				</p>
			</div>
			<Drawer.Close>
				<button type="button" class="hover:bg-bg-muted rounded-md p-1.5" aria-label="Close"
					>×</button
				>
			</Drawer.Close>
		</Drawer.Header>
		<Drawer.Body>
			<form
				id="create-permission-request-form"
				class="stack stack-relaxed"
				onsubmit={onSubmit}
				novalidate
			>
				<TextField
					label="Permission"
					name="permission"
					placeholder="e.g. identity.users.create"
					bind:value={form.values.permission}
					required
					error={form.errors.permission}
					onblur={() => form.validateField('permission')}
				/>
				<label class="stack stack-tight">
					<span class="label">Duration (days)</span>
					<input
						type="number"
						bind:value={form.values.duration_days}
						min={1}
						max={365}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
					<span class="caption text-fg-subtle">Leave blank for the tenant default.</span>
				</label>
				<label class="stack stack-tight">
					<span class="label">Reason</span>
					<textarea
						bind:value={form.values.reason}
						required
						minlength={10}
						maxlength={1024}
						rows={4}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
					{#if form.errors.reason}
						<span class="caption text-danger-700">{form.errors.reason}</span>
					{/if}
				</label>
				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Drawer.Body>
		<Drawer.Footer>
			<Drawer.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Drawer.Close>
			<Button type="submit" form="create-permission-request-form" loading={form.isSubmitting}
				>Submit request</Button
			>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>
