<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Tabs from '$ui/tabs';

	const { Story } = defineMeta({
		title: 'UI/Tabs',
		component: Tabs.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Underline (default)">
	<div style="width: 560px;">
		<Tabs.Root value="overview">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="members">Members</Tabs.Trigger>
				<Tabs.Trigger value="roles">Roles</Tabs.Trigger>
				<Tabs.Trigger value="activity">Activity</Tabs.Trigger>
				<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview">
				<div class="stack stack-tight p-4">
					<p class="body-base text-fg">Overview panel content.</p>
					<p class="body-sm text-fg-muted">Tenant summary, key metrics, recent activity feed.</p>
				</div>
			</Tabs.Content>
			<Tabs.Content value="members">
				<p class="body-base text-fg p-4">Members panel content.</p>
			</Tabs.Content>
			<Tabs.Content value="roles">
				<p class="body-base text-fg p-4">Roles panel content.</p>
			</Tabs.Content>
			<Tabs.Content value="activity">
				<p class="body-base text-fg p-4">Activity panel content.</p>
			</Tabs.Content>
			<Tabs.Content value="settings">
				<p class="body-base text-fg p-4">Settings panel content.</p>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</Story>

<Story name="Pills">
	<div style="width: 480px;">
		<Tabs.Root value="new">
			<Tabs.List variant="pills">
				<Tabs.Trigger value="new">New</Tabs.Trigger>
				<Tabs.Trigger value="contacted">Contacted</Tabs.Trigger>
				<Tabs.Trigger value="qualified">Qualified</Tabs.Trigger>
				<Tabs.Trigger value="closed">Closed</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="new">
				<p class="body-sm text-fg-muted p-4">42 leads in “New” stage.</p>
			</Tabs.Content>
			<Tabs.Content value="contacted">
				<p class="body-sm text-fg-muted p-4">18 leads in “Contacted” stage.</p>
			</Tabs.Content>
			<Tabs.Content value="qualified">
				<p class="body-sm text-fg-muted p-4">9 leads in “Qualified” stage.</p>
			</Tabs.Content>
			<Tabs.Content value="closed">
				<p class="body-sm text-fg-muted p-4">3 leads in “Closed” stage.</p>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</Story>

<Story name="Overflow (horizontal scroll)">
	<div style="width: 320px;">
		<Tabs.Root value="t1">
			<Tabs.List>
				<Tabs.Trigger value="t1">Overview</Tabs.Trigger>
				<Tabs.Trigger value="t2">Quotations</Tabs.Trigger>
				<Tabs.Trigger value="t3">Invoices</Tabs.Trigger>
				<Tabs.Trigger value="t4">Shipments</Tabs.Trigger>
				<Tabs.Trigger value="t5">Returns</Tabs.Trigger>
				<Tabs.Trigger value="t6">Settings</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="t1">
				<p class="body-sm text-fg-muted p-4">
					Underline strip scrolls horizontally on narrow viewports.
				</p>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</Story>
