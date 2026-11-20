<script lang="ts">
	import * as Drawer from '#lib/components/ui/drawer/index.ts';

	let {
		open = $bindable(true),
		busy = false,
		direction,
		dismissible,
		onOpenChange
	}: {
		open?: boolean;
		busy?: boolean;
		direction?: 'top' | 'right' | 'bottom' | 'left';
		dismissible?: boolean;
		onOpenChange?: (open: boolean) => void;
	} = $props();
</script>

<Drawer.Root bind:open {busy} {direction} {dismissible} {onOpenChange}>
	<Drawer.Content>
		<Drawer.Title>Host</Drawer.Title>
		<Drawer.Description>Test drawer</Drawer.Description>
		<input aria-label="Name" />
		<Drawer.Close>Close it</Drawer.Close>
	</Drawer.Content>
</Drawer.Root>
