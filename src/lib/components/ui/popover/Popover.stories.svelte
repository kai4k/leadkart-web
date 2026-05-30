<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Popover from '$ui/popover';
	import { Button } from '$ui/button';
	import TextField from '$lib/components/form/TextField.svelte';
	import Switch from '$lib/components/form/Switch.svelte';
	import { Filter, Settings } from '$icons';

	const { Story } = defineMeta({
		title: 'UI/Popover',
		component: Popover.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Filter popover">
	<Popover.Root>
		<Popover.Trigger>
			<Button variant="outline">
				<Filter size={14} />
				Filters
			</Button>
		</Popover.Trigger>
		<Popover.Content align="start">
			<div class="stack">
				<TextField label="Search" placeholder="Lead name or company" />
				<TextField label="State" placeholder="Any state" />
				<div class="flex justify-end gap-2">
					<Button variant="ghost" size="sm">Reset</Button>
					<Button size="sm">Apply</Button>
				</div>
			</div>
		</Popover.Content>
	</Popover.Root>
</Story>

<Story name="Settings popover (with switches)">
	<Popover.Root>
		<Popover.Trigger>
			<Button variant="ghost" size="icon" aria-label="Display preferences">
				<Settings size={16} />
			</Button>
		</Popover.Trigger>
		<Popover.Content align="end">
			<div class="stack">
				<p class="body-sm text-fg font-semibold">Display preferences</p>
				<Switch label="Compact density" />
				<Switch label="Show archived rows" />
				<Switch label="Group by stage" checked />
			</div>
		</Popover.Content>
	</Popover.Root>
</Story>

<Story name="Positioning — side & align">
	<div class="flex items-center justify-center" style="padding: 80px;">
		<Popover.Root>
			<Popover.Trigger>
				<Button variant="outline">Top-start</Button>
			</Popover.Trigger>
			<Popover.Content side="top" align="start">
				<p class="body-sm text-fg-muted">
					side=top · align=start — positioned above the trigger, left-edge-aligned.
				</p>
			</Popover.Content>
		</Popover.Root>
	</div>
</Story>
