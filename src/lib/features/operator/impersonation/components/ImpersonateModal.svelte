<script lang="ts">
	import { z } from 'zod';
	import { Alert, Button, Dialog } from '$ui';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	/** Form-local schema — reason min 10 chars, duration 1-240 min. */
	const impersonateFormSchema = z.object({
		reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
		duration_minutes: z.number().int().min(1).max(240)
	});

	const isPending = $derived(impersonation.status === 'mutating');

	const form = useForm(impersonateFormSchema, {
		reason: '',
		duration_minutes: 30
	});

	async function onSubmit(e: SubmitEvent) {
		if (!tenant) {
			e.preventDefault();
			return;
		}
		await form.submit(e, async (values) => {
			await impersonation.start({
				target_tenant_id: tenant!.id,
				reason: values.reason,
				duration_minutes: values.duration_minutes
			});
			form.reset();
			onOpenChange(false);
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Impersonate {tenant?.display_name ?? 'tenant'}</h2>
				<p class="caption text-fg-muted">
					Records an audited session of your activity while acting on this tenant's behalf. All
					requests are logged with this session ID for the operator audit trail.
				</p>
			</div>
		</Dialog.Header>
		<Dialog.Body>
			<Alert variant="warning">
				Every action is auditable to you, with the reason below. End the session as soon as your
				task is complete.
			</Alert>
			<form id="impersonate-form" class="stack stack-relaxed mt-4" onsubmit={onSubmit}>
				<label class="stack stack-tight">
					<span class="label">Reason (required, audited — minimum 10 characters)</span>
					<textarea
						bind:value={form.values.reason}
						required
						minlength={10}
						maxlength={500}
						rows={3}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
					{#if form.errors.reason}
						<span class="caption text-danger">{form.errors.reason}</span>
					{/if}
				</label>
				<label class="stack stack-tight">
					<span class="label">Duration (minutes — max 240)</span>
					<input
						type="number"
						bind:value={form.values.duration_minutes}
						min={1}
						max={240}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
					{#if form.errors.duration_minutes}
						<span class="caption text-danger">{form.errors.duration_minutes}</span>
					{/if}
				</label>
				{#if form.bannerError}
					<Alert variant="danger">{form.bannerError}</Alert>
				{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer class="flex flex-col gap-2 sm:flex-row sm:justify-end">
			<Dialog.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Dialog.Close>
			<Button
				type="submit"
				form="impersonate-form"
				disabled={!tenant || form.isSubmitting}
				loading={isPending}
			>
				Start impersonation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
