<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TagInput from './TagInput.svelte';

	const { Story } = defineMeta({
		title: 'Form/TagInput',
		component: TagInput,
		tags: ['autodocs']
	});

	const SUGGESTIONS = [
		'pharma',
		'wholesale',
		'retail',
		'ayurvedic',
		'allopathic',
		'hospital',
		'chain-store'
	];
</script>

<Story name="Empty">
	<div style="width: 360px;">
		<TagInput label="Tags" value={[]} placeholder="Add a tag…" suggestions={SUGGESTIONS} />
	</div>
</Story>

<Story name="With tags">
	<div style="width: 360px;">
		<TagInput
			label="Tags"
			value={['pharma', 'wholesale']}
			placeholder="Add a tag…"
			suggestions={SUGGESTIONS}
		/>
	</div>
</Story>

<Story name="At max-tags limit">
	<div style="width: 360px;">
		<TagInput
			label="Tags (max 3)"
			value={['pharma', 'wholesale', 'allopathic']}
			maxTags={3}
			placeholder="Add a tag…"
		/>
	</div>
</Story>

<Story name="Disabled">
	<div style="width: 360px;">
		<TagInput label="Tags" value={['pharma', 'wholesale']} disabled />
	</div>
</Story>
