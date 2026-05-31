<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Tree from '$ui/tree';
	import { Shield, Users, FolderOpen, FileText } from '$icons';

	const { Story } = defineMeta({
		title: 'UI/Tree',
		component: Tree.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Role hierarchy">
	<div style="width: 320px;">
		<Tree.Root aria-label="Role hierarchy">
			<Tree.Node label="Owner" icon={Shield} expanded>
				<Tree.Node label="Admin" icon={Shield} level={1} expanded>
					<Tree.Node label="Sales manager" icon={Users} level={2} />
					<Tree.Node label="Operations manager" icon={Users} level={2} />
				</Tree.Node>
				<Tree.Node label="Member" icon={Users} level={1}>
					<Tree.Node label="Sales agent" level={2} />
					<Tree.Node label="Support agent" level={2} />
				</Tree.Node>
			</Tree.Node>
		</Tree.Root>
	</div>
</Story>

<Story name="File tree (with selection)">
	<div style="width: 320px;">
		<Tree.Root aria-label="File tree">
			<Tree.Node label="src" icon={FolderOpen} expanded>
				<Tree.Node label="lib" icon={FolderOpen} level={1} expanded>
					<Tree.Node label="components" icon={FolderOpen} level={2}>
						<Tree.Node label="Button.svelte" icon={FileText} level={3} />
						<Tree.Node label="Card.svelte" icon={FileText} level={3} />
					</Tree.Node>
					<Tree.Node label="api.ts" icon={FileText} level={2} selected />
				</Tree.Node>
				<Tree.Node label="routes" icon={FolderOpen} level={1} />
			</Tree.Node>
		</Tree.Root>
	</div>
</Story>

<Story name="With disabled nodes">
	<div style="width: 320px;">
		<Tree.Root aria-label="Permissions">
			<Tree.Node label="Tenant" icon={Shield} expanded>
				<Tree.Node label="View" level={1} />
				<Tree.Node label="Edit" level={1} />
				<Tree.Node label="Delete" level={1} disabled />
			</Tree.Node>
		</Tree.Root>
	</div>
</Story>
