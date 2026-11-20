<script lang="ts">
	import * as Sheet from '#lib/components/ui/sheet/index.ts';

	let {
		open = $bindable(true),
		busy = false,
		side,
		onOpenChange
	}: {
		open?: boolean;
		busy?: boolean;
		side?: 'top' | 'right' | 'bottom' | 'left';
		onOpenChange?: (open: boolean) => void;
	} = $props();
</script>

<Sheet.Root bind:open {busy} {onOpenChange}>
	<Sheet.Content {side} showCloseButton>
		<Sheet.Header>
			<Sheet.Title>Host</Sheet.Title>
			<Sheet.Description>Test sheet</Sheet.Description>
		</Sheet.Header>
		<Sheet.Body><input aria-label="Name" /></Sheet.Body>
		<Sheet.Footer>
			<Sheet.Close>Close it</Sheet.Close>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>
