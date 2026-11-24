<script lang="ts">
	import { z } from 'zod';
	import { Alert } from '#lib/components/ui/index.ts';
	import { auditReasonField } from '#lib/api/request-schema.ts';
	import { FormDialog, NumberInput, TextareaField } from '#lib/components/form/index.ts';
	import { _ } from 'svelte-i18n';
	import {
		AlreadyImpersonatingError,
		impersonation,
		ImpersonationRefusedError,
		StartOutcomeUnknownError
	} from '../stores/impersonation.svelte';
	// Type-only; deliberately bypasses the tenants barrel to avoid a cycle
	// (tenants barrel -> TenantsList -> impersonation -> ImpersonateModal -> tenants).
	import type { TenantDto } from '../../tenants/types';

	type Props = { open: boolean; tenant: TenantDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), tenant, onOpenChange }: Props = $props();

	/** Form-local schema: the shared audit reason (10 to 1024 after trimming), duration 1-240 min. */
	const impersonateFormSchema = z.object({
		reason: auditReasonField,
		duration_minutes: z.number().int().min(1).max(240)
	});

	async function onSubmit(values: z.output<typeof impersonateFormSchema>) {
		// Opened only with a tenant; a missing one is a no-op, never a request without a target.
		if (!tenant) return;
		let result;
		try {
			result = await impersonation.start(
				{
					target_tenant_id: tenant.id,
					reason: values.reason,
					duration_minutes: values.duration_minutes
				},
				tenant.display_name
			);
		} catch (err) {
			if (!(err instanceof StartOutcomeUnknownError)) throw err;
			// no answer in time: the store keeps looking; the dialog stays (busy) and then closes as success, or says it did not start
			const answer = await impersonation.resolveUnknownStart();
			if (answer === 'started') return;
			// "did not start" is said only after a read that answered; with none, nothing is known and the banner says so
			throw new ImpersonationRefusedError(
				$_(
					answer === 'unknown'
						? 'shell.impersonation.outcomeUnknown'
						: 'shell.impersonation.notStarted'
				)
			);
		}
		// the server already lists a session for this person (the banner shows it): nothing was posted
		if (result.kind === 'already') throw new AlreadyImpersonatingError();
	}
</script>

<FormDialog
	bind:open
	{onOpenChange}
	size="lg"
	title={`Impersonate ${tenant?.display_name ?? 'tenant'}`}
	description="Records an audited session of your activity while acting on this tenant's behalf. All requests are logged with this session ID for the operator audit trail."
	submitLabel="Start impersonation"
	schema={impersonateFormSchema}
	initial={() => ({ reason: '', duration_minutes: 30 })}
	{onSubmit}
	formId="impersonate-form"
>
	{#snippet fields(form)}
		<!-- the store may keep looking after this dialog was told "not started"; the notice is for the wait -->
		{#if impersonation.checking && form.isSubmitting}
			<Alert variant="info">{$_('shell.impersonation.startUnknown')}</Alert>
		{/if}
		<Alert variant="warning">
			Every action is auditable to you, with the reason below. End the session as soon as your task
			is complete.
		</Alert>
		<TextareaField
			label="Reason (required, audited — minimum 10 characters)"
			name="reason"
			singleLine
			rows={3}
			maxlength={1024}
			required
			bind:value={form.values.reason}
			error={form.errors.reason}
		/>
		<NumberInput
			label="Duration (minutes — max 240)"
			name="duration_minutes"
			min={1}
			max={240}
			bind:value={
				() => form.values.duration_minutes ?? null, (v) => (form.values.duration_minutes = v ?? 0)
			}
			error={form.errors.duration_minutes}
		/>
	{/snippet}
</FormDialog>
