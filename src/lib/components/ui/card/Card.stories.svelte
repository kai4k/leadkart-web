<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import * as Card from '$ui/card';
	import { Button } from '$ui/button';
	import { Badge } from '$ui/badge';

	const { Story } = defineMeta({
		title: 'UI/Card',
		component: Card.Root,
		tags: ['autodocs']
	});
</script>

<Story name="Solid (default)">
	<div style="width: 360px;">
		<Card.Root padding="md" elevation="sm">
			<Card.Header>
				<Card.Title>Acme Pharma Pvt Ltd</Card.Title>
				<Card.Description>PCD Pharma · Maharashtra · Active</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="body-sm text-fg-muted">
					Onboarded 2026-03-14. 12 active members, 4 marketplace listings.
				</p>
			</Card.Content>
			<Card.Footer>
				<Button variant="outline" size="sm">View profile</Button>
			</Card.Footer>
		</Card.Root>
	</div>
</Story>

<Story name="Glass material">
	<div
		style="width: 360px; padding: 24px; background: linear-gradient(135deg, var(--color-brand-400) 0%, var(--color-brand-600) 100%);"
	>
		<Card.Root surface="glass" padding="md">
			<Card.Header>
				<Card.Title>Liquid-Glass widget</Card.Title>
				<Card.Description>Translucent material with backdrop blur.</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="body-sm text-fg">
					Used for hero callouts and stat overlays where the surrounding gradient should show
					through.
				</p>
			</Card.Content>
		</Card.Root>
	</div>
</Story>

<Story name="Interactive (hoverable)">
	<div style="width: 320px;">
		<Card.Root padding="md" elevation="sm" interactive>
			<Card.Header>
				<Card.Title>Cetirizine 10mg</Card.Title>
				<Card.Description>Allopathic · Tablet · 60 strips/box</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex items-center justify-between">
					<span class="body-base text-fg font-semibold">₹42.50</span>
					<Badge variant="success" appearance="soft" size="sm">In stock</Badge>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</Story>

<Story name="Padding scale">
	<div class="stack stack-loose" style="width: 320px;">
		<Card.Root padding="sm" elevation="sm">
			<p class="body-sm text-fg-muted">Padding: sm (12px)</p>
		</Card.Root>
		<Card.Root padding="md" elevation="sm">
			<p class="body-sm text-fg-muted">Padding: md (16px)</p>
		</Card.Root>
		<Card.Root padding="lg" elevation="sm">
			<p class="body-sm text-fg-muted">Padding: lg (24px)</p>
		</Card.Root>
	</div>
</Story>

<Story name="Elevation scale">
	<div class="stack stack-loose" style="width: 320px;">
		<Card.Root padding="md" elevation="none">
			<p class="body-sm text-fg-muted">Elevation: none</p>
		</Card.Root>
		<Card.Root padding="md" elevation="sm">
			<p class="body-sm text-fg-muted">Elevation: sm</p>
		</Card.Root>
		<Card.Root padding="md" elevation="md">
			<p class="body-sm text-fg-muted">Elevation: md</p>
		</Card.Root>
		<Card.Root padding="md" elevation="lg">
			<p class="body-sm text-fg-muted">Elevation: lg</p>
		</Card.Root>
	</div>
</Story>
