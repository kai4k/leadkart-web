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
	noun="tenant"
	conflict="This tenant is already suspended."
	{onConfirm}
/>
