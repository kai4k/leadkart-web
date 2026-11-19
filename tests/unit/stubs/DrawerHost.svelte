<script lang="ts">
	import * as Drawer from '#lib/components/ui/drawer/index.ts';

	let {
		open = $bindable(true),
		busy = false,
		onOpenChange
	}: { open?: boolean; busy?: boolean; onOpenChange?: (open: boolean) => void } = $props();
</script>

<Drawer.Root bind:open {busy} {onOpenChange}>
	<Drawer.Content>
		<Drawer.Title>Host</Drawer.Title>
		<Drawer.Description>Test drawer</Drawer.Description>
		<Drawer.Close>Close it</Drawer.Close>
	</Drawer.Content>
</Drawer.Root>
