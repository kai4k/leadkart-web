<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import FileDropZone from './FileDropZone.svelte';

	const { Story } = defineMeta({
		title: 'Form/FileDropZone',
		component: FileDropZone,
		tags: ['autodocs']
	});
</script>

<Story name="Empty (single)">
	<div style="width: 480px;">
		<FileDropZone
			label="Upload CSV"
			value={null}
			accept=".csv"
			placeholder="Drag a CSV file here, or click to browse"
			hint="Max 10 MB. UTF-8 encoded."
		/>
	</div>
</Story>

<Story name="Empty (multiple)">
	<div style="width: 480px;">
		<FileDropZone
			label="Upload images"
			value={null}
			accept="image/*"
			multiple
			placeholder="Drop image files or click to browse"
			hint="JPEG / PNG / WebP. Max 5 MB per file."
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 480px;">
		<FileDropZone
			label="Upload CSV"
			value={null}
			accept=".csv"
			disabled
			placeholder="Plan upgrade required."
		/>
	</div>
</Story>
