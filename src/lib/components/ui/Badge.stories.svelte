<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Badge from './Badge.svelte';

	/**
	 * Badge — status/counter pill.
	 *
	 * Variant (colour intent): neutral / success / warning / danger / info / brand
	 * Appearance (fill style): solid / soft / outline
	 * Size:                    sm / md
	 *
	 * Industry refs: Polaris Badge, Linear status pill, Atlassian Lozenge,
	 * GitHub Primer Label. The "appearance" prop replaces the older
	 * `style` prop (was colliding with the HTML style attribute).
	 */
	const { Story } = defineMeta({
		title: 'UI/Badge',
		component: Badge,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: 'select',
				options: ['neutral', 'success', 'warning', 'danger', 'info', 'brand']
			},
			appearance: { control: 'select', options: ['solid', 'soft', 'outline'] },
			size: { control: 'select', options: ['sm', 'md'] }
		},
		args: { variant: 'neutral', appearance: 'soft', size: 'md' }
	});
</script>

<Story name="Neutral">
	<Badge variant="neutral">Draft</Badge>
</Story>

<Story name="Success">
	<Badge variant="success">Active</Badge>
</Story>

<Story name="Warning">
	<Badge variant="warning">Pending</Badge>
</Story>

<Story name="Danger">
	<Badge variant="danger">Suspended</Badge>
</Story>

<Story name="Info">
	<Badge variant="info">New</Badge>
</Story>

<Story name="Brand">
	<Badge variant="brand">Premium</Badge>
</Story>

<Story name="Appearance — solid">
	<Badge variant="success" appearance="solid">Active</Badge>
</Story>

<Story name="Appearance — outline">
	<Badge variant="danger" appearance="outline">Suspended</Badge>
</Story>

<Story name="Size — sm">
	<Badge variant="info" size="sm">Compact</Badge>
</Story>

<Story name="All variants — soft row">
	<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
		<Badge variant="neutral">Neutral</Badge>
		<Badge variant="success">Success</Badge>
		<Badge variant="warning">Warning</Badge>
		<Badge variant="danger">Danger</Badge>
		<Badge variant="info">Info</Badge>
		<Badge variant="brand">Brand</Badge>
	</div>
</Story>

<Story name="All variants — outline row">
	<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
		<Badge variant="neutral" appearance="outline">Neutral</Badge>
		<Badge variant="success" appearance="outline">Success</Badge>
		<Badge variant="warning" appearance="outline">Warning</Badge>
		<Badge variant="danger" appearance="outline">Danger</Badge>
		<Badge variant="info" appearance="outline">Info</Badge>
		<Badge variant="brand" appearance="outline">Brand</Badge>
	</div>
</Story>

<Story name="All variants — solid row">
	<div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
		<Badge variant="neutral" appearance="solid">Neutral</Badge>
		<Badge variant="success" appearance="solid">Success</Badge>
		<Badge variant="warning" appearance="solid">Warning</Badge>
		<Badge variant="danger" appearance="solid">Danger</Badge>
		<Badge variant="info" appearance="solid">Info</Badge>
		<Badge variant="brand" appearance="solid">Brand</Badge>
	</div>
</Story>
