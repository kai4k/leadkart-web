<script lang="ts">
	import * as Command from '#lib/components/ui/command/index.ts';

	let { open = $bindable(true) }: { open?: boolean } = $props();
</script>

<Command.Dialog bind:open title="Search" description="Search pages">
	<Command.Input aria-label="Search" />
	<Command.List>
		<Command.Item>Home</Command.Item>
	</Command.List>
</Command.Dialog>
