<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Tooltip from '$ui/tooltip';
	import Button from '$ui/Button.svelte';
	import { Info, HelpCircle } from '$icons';

	const { Story } = defineMeta({
		title: 'UI/Tooltip',
		component: Tooltip.Root,
		tags: ['autodocs']
	});
</script>

<Story name="On button">
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button variant="outline">Hover me</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>Quick keyboard shortcut: ⌘K</Tooltip.Content>
	</Tooltip.Root>
</Story>

<Story name="On icon (help affordance)">
	<div class="flex items-center gap-2">
		<span class="body-sm text-fg">Marketplace lead credits</span>
		<Tooltip.Root>
			<Tooltip.Trigger>
				<button
					type="button"
					class="text-fg-subtle hover:text-fg"
					aria-label="What are lead credits?"
				>
					<HelpCircle size={14} />
				</button>
			</Tooltip.Trigger>
			<Tooltip.Content>
				One credit is consumed each time you unlock a lead's contact info.
			</Tooltip.Content>
		</Tooltip.Root>
	</div>
</Story>

<Story name="On disabled element (wrapper pattern)">
	<Tooltip.Root>
		<Tooltip.Trigger>
			<span class="inline-block">
				<Button disabled>Submit for review</Button>
			</span>
		</Tooltip.Trigger>
		<Tooltip.Content>Add at least one product before submitting.</Tooltip.Content>
	</Tooltip.Root>
</Story>

<Story name="Multi-line content">
	<Tooltip.Root>
		<Tooltip.Trigger>
			<Button variant="ghost" size="icon" aria-label="API status">
				<Info size={16} />
			</Button>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<div class="stack stack-tight" style="max-width: 240px;">
				<p class="body-sm font-medium">API health</p>
				<p class="caption text-fg-muted">
					All endpoints reachable. p95 latency 180ms. Last incident 14 days ago.
				</p>
			</div>
		</Tooltip.Content>
	</Tooltip.Root>
</Story>
