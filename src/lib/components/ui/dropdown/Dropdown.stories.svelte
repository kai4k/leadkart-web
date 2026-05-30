<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Dropdown from '$ui/dropdown';
	import { Button } from '$ui/button';
	import { MoreHorizontal, Edit, Copy, Archive, Trash2 } from '$icons';

	const { Story } = defineMeta({
		title: 'UI/Dropdown',
		component: Dropdown.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Default actions">
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="outline">Actions</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onSelect={() => {}}>Edit profile</Dropdown.Item>
			<Dropdown.Item onSelect={() => {}}>Copy invite link</Dropdown.Item>
			<Dropdown.Item onSelect={() => {}}>Export as CSV</Dropdown.Item>
		</Dropdown.Menu>
	</Dropdown.Root>
</Story>

<Story name="With danger action">
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="ghost" size="icon" aria-label="Row actions">
				<MoreHorizontal size={16} />
			</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onSelect={() => {}}>
				<Edit size={14} />
				Edit
			</Dropdown.Item>
			<Dropdown.Item onSelect={() => {}}>
				<Copy size={14} />
				Duplicate
			</Dropdown.Item>
			<Dropdown.Item onSelect={() => {}}>
				<Archive size={14} />
				Archive
			</Dropdown.Item>
			<Dropdown.Separator />
			<Dropdown.Item variant="danger" onSelect={() => {}}>
				<Trash2 size={14} />
				Delete
			</Dropdown.Item>
		</Dropdown.Menu>
	</Dropdown.Root>
</Story>

<Story name="With disabled items">
	<Dropdown.Root>
		<Dropdown.Trigger>
			<Button variant="outline">Bulk actions</Button>
		</Dropdown.Trigger>
		<Dropdown.Menu>
			<Dropdown.Item onSelect={() => {}}>Approve selected</Dropdown.Item>
			<Dropdown.Item onSelect={() => {}}>Reassign owner</Dropdown.Item>
			<Dropdown.Item disabled onSelect={() => {}}>Export (plan upgrade required)</Dropdown.Item>
			<Dropdown.Separator />
			<Dropdown.Item variant="danger" onSelect={() => {}}>Delete selected</Dropdown.Item>
		</Dropdown.Menu>
	</Dropdown.Root>
</Story>
