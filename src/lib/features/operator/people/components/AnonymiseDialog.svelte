<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { anonymisePersonMutation } from '../queries';
	import type { PersonDto } from '../types';
	import { describeReasonError } from '$api/errors';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let typedEmail = $state('');
	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	const mutation = anonymisePersonMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, mutation);
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
				onError: (err: unknown) => {
					({ reasonError, banner: bannerError } = describeReasonError(err, {
						fallback: 'Anonymisation failed. Please try again.',
						status: {
							403: "You don't have permission to anonymise people.",
							404: 'This person was deleted or moved.',
							409: 'This person is already anonymised.'
						}
					}));
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
		<Alert variant="destructive">
			<strong>This cannot be undone.</strong> Type the email below to confirm.
		</Alert>
		<label class="stack stack-tight mt-4 w-full">
			<span class="label text-sm md:text-base"
				>Type <code class="bg-muted rounded px-1">{person?.email ?? ''}</code> to confirm</span
			>
			<input
				bind:value={typedEmail}
				class="bg-card border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			/>
		</label>
		<label class="stack stack-tight mt-4 w-full">
			<!-- Go's anonymise handler ignores the request body today, so the reason is NOT audited yet.
			     Restore "(required, audited)" when the backend change that records it lands. -->
			<span class="label text-sm md:text-base">Reason (required)</span>
			<textarea
				bind:value={reason}
				required
				minlength={1}
				maxlength={500}
				rows={3}
				aria-invalid={reasonError ? 'true' : undefined}
				class="bg-card border border-border rounded-md w-full rounded-md px-3 py-2 text-sm"
			></textarea>
			{#if reasonError}<span class="body-sm text-destructive">{reasonError}</span>{/if}
		</label>
		{#if bannerError}<Alert class="mt-4" variant="destructive">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
