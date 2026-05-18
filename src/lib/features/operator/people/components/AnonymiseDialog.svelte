<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { anonymisePersonMutation } from '$features/operator/people/queries';
	import type { PersonDto } from '$features/operator/people/types';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let typedEmail = $state('');
	let reason = $state('');
	let error = $state<string | null>(null);

	const mutation = anonymisePersonMutation();
	const isPending = $derived(mutation.isPending);
	const canConfirm = $derived(
		person !== null && typedEmail === person.email && reason.trim().length > 0
	);

	async function onConfirm() {
		if (!person || !canConfirm) return;
		error = null;
		mutation.mutate(
			{ id: person.id, reason: reason.trim() },
			{
				onSuccess: () => {
					typedEmail = '';
					reason = '';
					onOpenChange(false);
				},
				onError: (err) => (error = err instanceof Error ? err.message : 'Anonymisation failed')
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Anonymise {person?.email ?? 'person'}"
	description="DPDP irreversible: replaces all PII with placeholders, deactivates every Membership. The Person row is preserved for audit but no original data is recoverable."
	confirmLabel="Anonymise permanently"
	variant="danger"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<Alert variant="danger">
			<strong>This cannot be undone.</strong> Type the email below to confirm.
		</Alert>
		<label class="stack stack-tight mt-4">
			<span class="label"
				>Type <code class="bg-bg-muted rounded px-1">{person?.email ?? ''}</code> to confirm</span
			>
			<input bind:value={typedEmail} class="glass-input rounded-md px-3 py-2 text-sm" />
		</label>
		<label class="stack stack-tight mt-4">
			<span class="label">Reason (required, audited)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if error}<Alert class="mt-4" variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
