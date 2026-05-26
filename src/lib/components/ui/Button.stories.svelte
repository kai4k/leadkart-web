<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Plus, Trash2, Icon } from '$lib/icons';
	import Button from './Button.svelte';

	/**
	 * Button — primary CTA primitive.
	 *
	 * Variants (intent): primary / secondary / ghost / danger / link
	 * Sizes:           xs / sm / md / lg
	 * States:          default / hover / focus / loading / disabled
	 * Width modes:     auto (default), fullWidth (mobile + AuthCard canon)
	 *
	 * Industry refs: Polaris Button, Linear Button, Radix Themes Button.
	 */
	const { Story } = defineMeta({
		title: 'UI/Button',
		component: Button,
		tags: ['autodocs'],
		argTypes: {
			variant: {
				control: 'select',
				options: ['primary', 'secondary', 'ghost', 'danger', 'link']
			},
			size: { control: 'select', options: ['xs', 'sm', 'md', 'lg'] },
			loading: { control: 'boolean' },
			disabled: { control: 'boolean' },
			fullWidth: { control: 'boolean' }
		},
		args: {
			variant: 'primary',
			size: 'md',
			loading: false,
			disabled: false,
			fullWidth: false
		}
	});
</script>

<Story name="Primary">
	<Button variant="primary">Save changes</Button>
</Story>

<Story name="Secondary">
	<Button variant="secondary">Cancel</Button>
</Story>

<Story name="Ghost">
	<Button variant="ghost">More options</Button>
</Story>

<Story name="Danger">
	<Button variant="danger">Delete account</Button>
</Story>

<Story name="Link">
	<Button variant="link">Learn more</Button>
</Story>

<Story name="Loading">
	<Button variant="primary" loading>Saving…</Button>
</Story>

<Story name="Disabled">
	<Button variant="primary" disabled>Can't submit</Button>
</Story>

<Story name="With leading icon">
	<Button variant="primary">
		<Icon icon={Plus} size="sm" /> Add member
	</Button>
</Story>

<Story name="With trailing icon (danger)">
	<Button variant="danger">
		Delete <Icon icon={Trash2} size="sm" />
	</Button>
</Story>

<Story name="Full width">
	<div style="width: 320px;">
		<Button variant="primary" fullWidth>Continue</Button>
	</div>
</Story>

<Story name="Size — xs">
	<Button variant="primary" size="xs">Extra small</Button>
</Story>

<Story name="Size — sm">
	<Button variant="primary" size="sm">Small</Button>
</Story>

<Story name="Size — md (default)">
	<Button variant="primary" size="md">Medium</Button>
</Story>

<Story name="Size — lg">
	<Button variant="primary" size="lg">Large</Button>
</Story>

<Story name="All sizes — primary row">
	<div style="display: flex; gap: 0.75rem; align-items: center;">
		<Button variant="primary" size="xs">XS</Button>
		<Button variant="primary" size="sm">SM</Button>
		<Button variant="primary" size="md">MD</Button>
		<Button variant="primary" size="lg">LG</Button>
	</div>
</Story>

<Story name="All variants — row">
	<div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
		<Button variant="primary">Primary</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="danger">Danger</Button>
		<Button variant="link">Link</Button>
	</div>
</Story>
