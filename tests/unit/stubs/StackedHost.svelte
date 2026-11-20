<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';

	let {
		sheetOpen = $bindable(true),
		dialogOpen = $bindable(true)
	}: { sheetOpen?: boolean; dialogOpen?: boolean } = $props();
</script>

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content title="First" showCloseButton={false}>
		<Sheet.Body>
			<p>First panel</p>
			<!-- opened while the sheet is open, like a confirm over a form sheet -->
			<Dialog.Root bind:open={dialogOpen}>
				<Dialog.Content title="Second" showCloseButton={false}>
					<p>Second panel</p>
				</Dialog.Content>
			</Dialog.Root>
		</Sheet.Body>
	</Sheet.Content>
</Sheet.Root>
