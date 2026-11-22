<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';
	import { globalSuspendMutation } from '../queries';
	import type { PersonDto } from '../types';
	import { useResetOnChange } from '#lib/hooks/use-reset-on-change.svelte.ts';

	type Props = { open: boolean; person: PersonDto | null; onOpenChange: (open: boolean) => void };
	let { open = $bindable(false), person, onOpenChange }: Props = $props();

	const mutation = globalSuspendMutation();
	// The component outlives the dialog: detach the observer when it opens or closes (a late failure then toasts).
	useResetOnChange(() => open, mutation);

	async function onConfirm(reason: string) {
		if (!person) return;
		await mutation.mutateAsync({ id: person.id, reason });
	}
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Globally suspend {person?.email ?? 'person'}"
	description="The person will be unable to sign in to any tenant until the suspension is lifted. Active sessions are revoked server-side."
	confirmLabel="Suspend globally"
	variant="warning"
	reasonLabel="Reason (required, audited)"
	messages={{
		failed: $_('reasonConfirm.globalSuspend.failed'),
		forbidden: $_('reasonConfirm.globalSuspend.forbidden'),
		notFound: $_('reasonConfirm.globalSuspend.notFound'),
		conflict: $_('reasonConfirm.globalSuspend.conflict')
	}}
	{onConfirm}
/>
