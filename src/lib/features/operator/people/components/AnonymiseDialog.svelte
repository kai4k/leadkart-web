<script lang="ts">
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { Alert } from '$ui';
	import { anonymisePersonMutation } from '../queries';
	import type { PersonDto } from '../types';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	const mutation = anonymisePersonMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, mutation);

	async function onConfirm(reason: string) {
		if (!person) return;
		await mutation.mutateAsync({ id: person.id, reason });
	}
</script>

<!-- Go's anonymise handler ignores the request body today, so the reason is NOT audited yet.
     Restore "(required, audited)" when the backend change that records it lands. -->
<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Anonymise {person?.email ?? 'person'}"
	description="DPDP irreversible: replaces all PII with placeholders, deactivates every Membership. The Person row is preserved for audit but no original data is recoverable."
	confirmLabel="Anonymise permanently"
	reasonLabel="Reason (required)"
	confirmText={person?.email ?? ''}
	noun="person"
	conflict="This person is already anonymised."
	{onConfirm}
>
	{#snippet extra()}
		<Alert variant="destructive">
			<strong>This cannot be undone.</strong> Type the email below to confirm.
		</Alert>
	{/snippet}
</ReasonConfirmDialog>
