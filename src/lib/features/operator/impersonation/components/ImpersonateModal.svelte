<script lang="ts">
	import { Alert, Button, Dialog } from '$ui';
	import { impersonation } from '$features/operator/impersonation/stores/impersonation.svelte';
	import type { TenantDto } from '$features/operator/tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	let reason = $state('');
	let durationMinutes = $state(30);
	let error = $state<string | null>(null);

	const isPending = $derived(impersonation.status === 'mutating');
	const canSubmit = $derived(tenant !== null && reason.trim().length >= 10);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!tenant || !canSubmit) return;
		error = null;
		try {
			await impersonation.start({
				target_tenant_id: tenant.id,
				reason: reason.trim(),
				duration_minutes: durationMinutes
			});
			reason = '';
			durationMinutes = 30;
			onOpenChange(false);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start impersonation';
		}
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h4">Impersonate {tenant?.display_name ?? 'tenant'}</h2>
				<p class="caption text-[var(--color-fg-muted)]">
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
						bind:value={reason}
						required
						minlength={10}
						maxlength={500}
						rows={3}
						class="glass-input w-full rounded-md px-3 py-2 text-sm"
					></textarea>
				</label>
				<label class="stack stack-tight">
					<span class="label">Duration (minutes — max 240)</span>
					<input
						type="number"
						bind:value={durationMinutes}
						min={1}
						max={240}
						class="glass-input rounded-md px-3 py-2 text-sm"
					/>
				</label>
				{#if error}<Alert variant="danger">{error}</Alert>{/if}
			</form>
		</Dialog.Body>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={isPending}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="impersonate-form" disabled={!canSubmit} loading={isPending}>
				Start impersonation
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
