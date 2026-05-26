<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AvatarGroup from './AvatarGroup.svelte';

	/**
	 * AvatarGroup — overlapping avatar stack with +N overflow chip.
	 * Industry refs: Slack channel members, Linear assignees, Figma room collaborators.
	 */
	const { Story } = defineMeta({
		title: 'UI/AvatarGroup',
		component: AvatarGroup,
		tags: ['autodocs'],
		argTypes: { max: { control: { type: 'number', min: 1, max: 10 } } }
	});

	const FOUR = [
		{ name: 'Alice Anderson' },
		{ name: 'Bob Brown' },
		{ name: 'Carol Carter' },
		{ name: 'Dave Drake' }
	];
	const TEN = [
		...FOUR,
		{ name: 'Eve Evans' },
		{ name: 'Frank Fox' },
		{ name: 'Grace Green' },
		{ name: 'Henry Hill' },
		{ name: 'Iris Ingram' },
		{ name: 'Jack Jones' }
	];
</script>

<Story name="3 members (no overflow)">
	<AvatarGroup members={FOUR.slice(0, 3)} />
</Story>

<Story name="4 members → +1 overflow (max=3)">
	<AvatarGroup members={FOUR} max={3} />
</Story>

<Story name="10 members → +7 overflow (max=3)">
	<AvatarGroup members={TEN} max={3} />
</Story>

<Story name="Large group, size=md">
	<AvatarGroup members={TEN} max={5} size="md" />
</Story>
