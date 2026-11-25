<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';

	let { kind }: { kind: 'dialog' | 'sheet' | 'alert-dialog' } = $props();
	let open = $state(false);
</script>

<!-- A plain button outside any Trigger part, the way the top bar opens the customizer. -->
<button type="button" data-testid="invoker" onclick={() => (open = true)}>Open it</button>

{#if kind === 'dialog'}
	<Dialog.Root bind:open>
		<Dialog.Content title="Host"><input aria-label="Name" /></Dialog.Content>
	</Dialog.Root>
{:else if kind === 'sheet'}
	<Sheet.Root bind:open>
		<Sheet.Content title="Host"><input aria-label="Name" /></Sheet.Content>
	</Sheet.Root>
{:else}
	<AlertDialog.Root bind:open>
		<AlertDialog.Content>
			<AlertDialog.Title>Host</AlertDialog.Title>
			<AlertDialog.Description>Sure?</AlertDialog.Description>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
