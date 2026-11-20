<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';

	let {
		open = $bindable(true),
		busy = false,
		onOpenChange
	}: { open?: boolean; busy?: boolean; onOpenChange?: (open: boolean) => void } = $props();
</script>

<Dialog.Root bind:open {busy} {onOpenChange}>
	<Dialog.Content>
		<Dialog.Title>Host</Dialog.Title>
		<Dialog.Description>Test dialog</Dialog.Description>
		<input aria-label="Name" />
		<Dialog.Close>Close it</Dialog.Close>
	</Dialog.Content>
</Dialog.Root>
