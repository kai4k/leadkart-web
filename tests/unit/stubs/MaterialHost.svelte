<script lang="ts">
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';

	let { which }: { which: 'dialog' | 'sheet' | 'alert-dialog' | 'popover' | 'dropdown-menu' } =
		$props();
</script>

{#if which === 'dialog'}
	<Dialog.Root open>
		<Dialog.Content title="Dialog" showCloseButton={false}><p>Body</p></Dialog.Content>
	</Dialog.Root>
{:else if which === 'sheet'}
	<Sheet.Root open>
		<Sheet.Content title="Sheet" showCloseButton={false}><p>Body</p></Sheet.Content>
	</Sheet.Root>
{:else if which === 'alert-dialog'}
	<AlertDialog.Root open>
		<AlertDialog.Content>
			<AlertDialog.Header><AlertDialog.Title>Sure?</AlertDialog.Title></AlertDialog.Header>
		</AlertDialog.Content>
	</AlertDialog.Root>
{:else if which === 'popover'}
	<Popover.Root open>
		<Popover.Trigger>t</Popover.Trigger>
		<Popover.Content><p>Body</p></Popover.Content>
	</Popover.Root>
{:else}
	<DropdownMenu.Root open>
		<DropdownMenu.Trigger>t</DropdownMenu.Trigger>
		<DropdownMenu.Content><DropdownMenu.Item>One</DropdownMenu.Item></DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}
