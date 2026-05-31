<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { anonymisePersonMutation } from '$features/operator/people/queries';
	import type { PersonDto } from '$features/operator/people/types';
	import {
		ValidationError,
		ConflictError,
		AuthError,
		NotFoundError,
		NetworkError
	} from '$api/errors';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let typedEmail = $state('');
	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	const mutation = anonymisePersonMutation();
	const isPending = $derived(mutation.isPending);
	const canConfirm = $derived(
		person !== null && typedEmail === person.email && reason.trim().length > 0
	);

	async function onConfirm() {
		if (!person || !canConfirm) return;
		reasonError = null;
		bannerError = null;
		mutation.mutate(
			{ id: person.id, reason: reason.trim() },
			{
				onSuccess: () => {
					typedEmail = '';
					reason = '';
					onOpenChange(false);
				},
				onError: (err) => {
					if (err instanceof ValidationError) {
						reasonError = err.fields.reason ?? null;
						bannerError = reasonError ? null : 'The server rejected this request.';
					} else if (err instanceof ConflictError) {
						bannerError = err.detail || 'This person is already anonymised.';
					} else if (err instanceof AuthError) {
						bannerError =
							err.status === 403
								? "You don't have permission to anonymise people."
								: 'Your session expired. Sign in again.';
					} else if (err instanceof NotFoundError) {
						bannerError = 'This person was deleted or moved.';
					} else if (err instanceof NetworkError) {
						bannerError = 'Check your network connection and try again.';
					} else {
						bannerError = 'Anonymisation failed. Please try again.';
					}
				}
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
		<label class="stack stack-tight mt-4 w-full">
			<span class="label text-sm md:text-base"
				>Type <code class="bg-bg-muted rounded px-1">{person?.email ?? ''}</code> to confirm</span
			>
			<input
				bind:value={typedEmail}
				class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			/>
		</label>
		<label class="stack stack-tight mt-4 w-full">
			<span class="label text-sm md:text-base">Reason (required, audited)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				aria-invalid={reasonError ? 'true' : undefined}
				class="bg-bg-elevated border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			></textarea>
			{#if reasonError}<span class="body-sm text-danger-700">{reasonError}</span>{/if}
		</label>
		{#if bannerError}<Alert class="mt-4" variant="danger">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
