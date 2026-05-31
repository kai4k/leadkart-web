<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { globalSuspendMutation } from '$features/operator/people/queries';
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

	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	const mutation = globalSuspendMutation();
	const isPending = $derived(mutation.isPending);

	async function onConfirm() {
		if (!person) return;
		reasonError = null;
		bannerError = null;
		mutation.mutate(
			{ id: person.id, reason: reason.trim() },
			{
				onSuccess: () => {
					reason = '';
					onOpenChange(false);
				},
				onError: (err) => {
					if (err instanceof ValidationError) {
						reasonError = err.fields.reason ?? null;
						bannerError = reasonError ? null : 'The server rejected this request.';
					} else if (err instanceof ConflictError) {
						bannerError = err.detail || 'This person is already globally suspended.';
					} else if (err instanceof AuthError) {
						bannerError =
							err.status === 403
								? "You don't have permission to globally suspend people."
								: 'Your session expired. Sign in again.';
					} else if (err instanceof NotFoundError) {
						bannerError = 'This person was deleted or moved.';
					} else if (err instanceof NetworkError) {
						bannerError = 'Check your network connection and try again.';
					} else {
						bannerError = 'Failed to suspend. Please try again.';
					}
				}
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Globally suspend {person?.email ?? 'person'}"
	description="The person will be unable to sign in to any tenant until the suspension is lifted. Active sessions are revoked server-side."
	confirmLabel="Suspend globally"
	variant="warning"
	loading={isPending}
	{onOpenChange}
	{onConfirm}
>
	{#snippet body()}
		<label class="stack stack-tight w-full">
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
		{#if bannerError}<Alert variant="danger">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
