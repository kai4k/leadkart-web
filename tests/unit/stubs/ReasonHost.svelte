<script lang="ts">
	import { ReasonConfirmDialog } from '#lib/components/feedback/index.ts';

	let {
		open = $bindable(true),
		confirmText,
		askReason = true,
		onConfirm,
		onOpenChange
	}: {
		open?: boolean;
		confirmText?: string;
		askReason?: boolean;
		onConfirm: (reason: string) => Promise<void>;
		onOpenChange: (open: boolean) => void;
	} = $props();
</script>

<ReasonConfirmDialog
	bind:open
	{onOpenChange}
	title="Suspend acme"
	confirmLabel="Suspend"
	{confirmText}
	{askReason}
	messages={{
		failed: 'Could not suspend this tenant. Please try again.',
		forbidden: "You don't have permission to suspend this tenant.",
		notFound: 'This tenant was deleted or moved.',
		conflict: 'This tenant is already suspended.'
	}}
	{onConfirm}
/>
