<script lang="ts">
	/**
	 * LogCallDialog — record a call outcome against a lead.
	 *
	 * Form: outcome (select), notes (textarea), optional callback_at +
	 * callback_window_minutes. Submit POSTs `/v1/crm/leads/{id}/calls`;
	 * the server creates a Reminder when callback_at is present so we
	 * invalidate both queries on success.
	 */
	import { Dialog, Button, Alert } from '$ui';
	import { Select, NumberInput } from '$form';
	import { logCallSchema } from '../schemas';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import { logCallMutation } from '../queries';
	import { CALL_OUTCOME_LABEL } from '../view-models';
	import type { CallOutcome } from '../schemas';

	type Props = {
		leadId: string;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	};

	let { leadId, open = $bindable(false), onOpenChange }: Props = $props();

	const mutation = logCallMutation();
	const form = useForm(
		logCallSchema,
		{
			outcome: 'connected' as CallOutcome,
			notes: '',
			callback_at: undefined as string | undefined,
			callback_window_minutes: undefined as number | undefined
		},
		{ validateOn: 'blur' }
	);

	const outcomeOptions = (Object.keys(CALL_OUTCOME_LABEL) as CallOutcome[]).map((k) => ({
		value: k,
		label: CALL_OUTCOME_LABEL[k]
	}));

	// NumberInput's `null` sentinel doesn't match the schema's `undefined`;
	// mirror locally + copy back on submit.
	let callbackWindow: number | null = $state(null);

	async function onSubmit(e: SubmitEvent) {
		form.values.callback_window_minutes = callbackWindow ?? undefined;
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(
					{ id: leadId, req: values },
					{
						onSuccess: () => {
							form.reset();
							onOpenChange(false);
							resolve();
						},
						onError: (err) => reject(err)
					}
				);
			});
		});
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<div class="stack stack-tight">
				<h2 class="h5">Log call</h2>
				<p class="body-sm text-fg-muted">Record the outcome and optionally schedule a callback.</p>
			</div>
		</Dialog.Header>

		<Dialog.Body>
			<form id="log-call-form" class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
				<Select
					label="Outcome"
					name="outcome"
					bind:value={form.values.outcome}
					options={outcomeOptions}
					required
					error={form.errors.outcome}
				/>

				<label class="stack stack-tight">
					<span class="label">Notes</span>
					<textarea
						name="notes"
						bind:value={form.values.notes}
						rows={3}
						maxlength={2000}
						class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
						placeholder="What did the lead say?"
					></textarea>
					{#if form.errors.notes}
						<span class="caption text-danger-700">{form.errors.notes}</span>
					{/if}
				</label>

				<label class="stack stack-tight">
					<span class="label">Callback at (optional)</span>
					<input
						type="datetime-local"
						name="callback_at"
						bind:value={form.values.callback_at}
						class="bg-bg-elevated border border-border rounded-md rounded-md px-3 py-2 text-sm"
					/>
				</label>

				<NumberInput
					label="Callback window (minutes)"
					bind:value={callbackWindow}
					min={5}
					max={720}
					step={5}
					hint="How long the callback slot stays open."
				/>

				{#if form.bannerError}<Alert variant="danger">{form.bannerError}</Alert>{/if}
			</form>
		</Dialog.Body>

		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="ghost" disabled={form.isSubmitting}>Cancel</Button>
			</Dialog.Close>
			<Button type="submit" form="log-call-form" loading={form.isSubmitting}>Log call</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
