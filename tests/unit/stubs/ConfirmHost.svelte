<script lang="ts">
	import ConfirmDialog, {
		type ConfirmDialogVariant
	} from '#lib/components/ui/ConfirmDialog.svelte';

	let {
		open = $bindable(true),
		variant = 'danger',
		loading = false,
		confirmDisabled = false,
		onConfirm,
		onOpenChange
	}: {
		open?: boolean;
		variant?: ConfirmDialogVariant;
		loading?: boolean;
		confirmDisabled?: boolean;
		onConfirm: () => void | Promise<void>;
		onOpenChange: (open: boolean) => void;
	} = $props();
</script>

<ConfirmDialog
	bind:open
	title="Delete the thing"
	description="This removes it."
	confirmLabel="Delete it"
	{variant}
	{loading}
	{confirmDisabled}
	{onConfirm}
	{onOpenChange}
/>
