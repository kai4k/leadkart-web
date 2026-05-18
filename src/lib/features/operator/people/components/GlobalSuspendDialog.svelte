<script lang="ts">
	import { ConfirmDialog, Alert } from '$ui';
	import { globalSuspendMutation } from '$features/operator/people/queries';
	import type { PersonDto } from '$features/operator/people/types';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	let reason = $state('');
	let error = $state<string | null>(null);

	const mutation = globalSuspendMutation();
	const isPending = $derived(mutation.isPending);

	async function onConfirm() {
		if (!person) return;
		error = null;
		mutation.mutate(
			{ id: person.id, reason: reason.trim() },
			{
				onSuccess: () => {
					reason = '';
					onOpenChange(false);
				},
				onError: (err) => (error = err instanceof Error ? err.message : 'Failed to suspend')
			}
		);
	}
</script>

<ConfirmDialog
	bind:open
	title="Globally suspend {person?.email ?? 'person'}"
	description="The person will be unable to sign in to any tenant until the suspension is lifted. Active sessions are revoked server-side."
	confirmLabel="Suspend globally"
	variant="danger"
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
				class="glass-input w-full rounded-md px-3 py-2 text-sm"
			></textarea>
		</label>
		{#if error}<Alert variant="danger">{error}</Alert>{/if}
	{/snippet}
</ConfirmDialog>
