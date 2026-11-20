<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { globalSuspendMutation } from '../queries';
	import type { PersonDto } from '../types';
	import { describeReasonError } from '$api/errors';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let reason = $state('');
	let reasonError = $state<string | null>(null);
	let bannerError = $state<string | null>(null);

	const mutation = globalSuspendMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, mutation);
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
				onError: (err: unknown) => {
					({ reasonError, banner: bannerError } = describeReasonError(err, {
						fallback: 'Failed to suspend. Please try again.',
						status: {
							403: "You don't have permission to globally suspend people.",
							404: 'This person was deleted or moved.',
							409: 'This person is already globally suspended.'
						}
					}));
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
		{#if bannerError}<Alert variant="destructive">{bannerError}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
