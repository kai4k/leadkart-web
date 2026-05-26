<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Spinner from './Spinner.svelte';

	/**
	 * Spinner — indeterminate loading indicator. Use for short waits
	 * (< 1 s); for longer loads pair with `<Skeleton>` to set spatial
	 * expectations.
	 *
	 * Sizes: xs / sm / md / lg
	 */
	const { Story } = defineMeta({
		title: 'UI/Spinner',
		component: Spinner,
		tags: ['autodocs'],
		argTypes: {
			size: { control: { type: 'number', min: 8, max: 64, step: 2 } }
		},
		args: { size: 20 }
	});
</script>

<Story name="Default (20px)">
	<Spinner />
</Story>

<Story name="Small (14px)">
	<Spinner size={14} />
</Story>

<Story name="Large (32px)">
	<Spinner size={32} />
</Story>

<Story name="Inline with text">
	<div style="display: inline-flex; align-items: center; gap: 0.5rem;">
		<Spinner size={14} />
		<span>Loading…</span>
	</div>
</Story>
