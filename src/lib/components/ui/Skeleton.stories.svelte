<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Skeleton from './Skeleton.svelte';

	/**
	 * Skeleton — loading placeholder. Renders only after >200 ms of
	 * load latency (handled by the consumer); sub-200ms loads should
	 * skip skeletons entirely to avoid a perceived flash.
	 *
	 * Industry refs: YouTube/Facebook skeleton-screen canon (2017+),
	 * Material 3 "Loading indicators".
	 */
	const { Story } = defineMeta({
		title: 'UI/Skeleton',
		component: Skeleton,
		tags: ['autodocs'],
		argTypes: {
			shape: { control: 'select', options: ['rect', 'circle', 'text'] }
		}
	});
</script>

<Story name="Text — single line">
	<Skeleton class="h-4 w-48" />
</Story>

<Story name="Text — multi line">
	<div style="display: flex; flex-direction: column; gap: 0.5rem; width: 320px;">
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-3/4" />
		<Skeleton class="h-4 w-1/2" />
	</div>
</Story>

<Story name="Circle — avatar">
	<Skeleton shape="circle" class="h-12 w-12" />
</Story>

<Story name="Card placeholder">
	<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 320px;">
		<Skeleton shape="circle" class="h-12 w-12" />
		<Skeleton class="h-5 w-2/3" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-3/4" />
		<Skeleton class="h-32 w-full rounded-md" />
	</div>
</Story>

<Story name="Table row placeholder">
	<div
		style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 1rem; width: 640px; align-items: center;"
	>
		<Skeleton class="h-4 w-3/4" />
		<Skeleton class="h-4 w-1/2" />
		<Skeleton class="h-4 w-1/3" />
		<Skeleton class="h-4 w-1/2" />
	</div>
</Story>
