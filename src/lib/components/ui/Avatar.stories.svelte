<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Avatar from './Avatar.svelte';

	/**
	 * Avatar — initials placeholder with size scale.
	 * Sizes: xs / sm / md / lg / xl
	 *
	 * Industry refs: Polaris Avatar, GitHub user avatars, Linear member chips.
	 */
	const { Story } = defineMeta({
		title: 'UI/Avatar',
		component: Avatar,
		tags: ['autodocs'],
		argTypes: {
			size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] }
		},
		args: { initials: 'AA', size: 'md' }
	});
</script>

<Story name="Default (MD)">
	<Avatar initials="AA" />
</Story>

<Story name="Size — xs">
	<Avatar initials="AA" size="xs" />
</Story>

<Story name="Size — sm">
	<Avatar initials="AA" size="sm" />
</Story>

<Story name="Size — lg">
	<Avatar initials="AA" size="lg" />
</Story>

<Story name="Size — xl">
	<Avatar initials="AA" size="xl" />
</Story>

<Story name="All sizes — row">
	<div style="display: flex; align-items: center; gap: 0.75rem;">
		<Avatar initials="AA" size="xs" />
		<Avatar initials="BB" size="sm" />
		<Avatar initials="CC" size="md" />
		<Avatar initials="DD" size="lg" />
		<Avatar initials="EE" size="xl" />
	</div>
</Story>
