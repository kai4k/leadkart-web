<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import InlineEdit from './InlineEdit.svelte';

	/**
	 * InlineEdit — click-to-edit text. Activates an autofocused input
	 * on click / Enter / Space, selecting current text. Enter or blur
	 * saves (awaiting onSave); Escape cancels.
	 *
	 * Industry refs: Linear inline title edit, Notion inline rename,
	 * GitHub repo description edit, Atlassian inline-edit pattern.
	 */
	const { Story } = defineMeta({
		title: 'UI/InlineEdit',
		component: InlineEdit,
		tags: ['autodocs']
	});
</script>

<Story name="With value">
	<InlineEdit value="Acme Pharma Pvt Ltd" onSave={() => {}} label="Display name" />
</Story>

<Story name="Empty (placeholder)">
	<InlineEdit value="" onSave={() => {}} placeholder="Click to add a display name" />
</Story>

<Story name="Disabled">
	<InlineEdit value="Locked field" onSave={() => {}} disabled />
</Story>

<Story name="With validator (min 3 chars)">
	<InlineEdit
		value="Hi"
		onSave={() => {}}
		validate={(v) => (v.length < 3 ? 'At least 3 characters required' : null)}
	/>
</Story>
