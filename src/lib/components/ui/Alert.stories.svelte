<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Alert from './Alert.svelte';

	/**
	 * Alert — in-flow status banner. Inline non-blocking; for blocking
	 * confirmations use `<Dialog>`/`<ConfirmDialog>` instead.
	 *
	 * Variants: info / success / warning / danger
	 * Slots:    children (body content), title (optional heading)
	 *
	 * Industry refs: Polaris Banner, Linear notice, Material Snackbar
	 * (in-flow variant).
	 */
	const { Story } = defineMeta({
		title: 'UI/Alert',
		component: Alert,
		tags: ['autodocs'],
		argTypes: {
			variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
			title: { control: 'text' },
			dismissible: { control: 'boolean' }
		},
		args: { variant: 'info', dismissible: false }
	});
</script>

<Story name="Info">
	<Alert variant="info">Heads up — your trial expires in 7 days.</Alert>
</Story>

<Story name="Success — with title">
	<Alert variant="success" title="Done">Member added.</Alert>
</Story>

<Story name="Warning — with title">
	<Alert variant="warning" title="Unsaved changes">
		You have unsaved edits. Save them before leaving the page.
	</Alert>
</Story>

<Story name="Danger — with title">
	<Alert variant="danger" title="Save failed">
		A membership already exists for this email in this tenant.
	</Alert>
</Story>

<Story name="Dismissible">
	<Alert variant="info" title="Tip" dismissible>Press / to open the search palette.</Alert>
</Story>

<Story name="All variants — stacked">
	<div style="display: flex; flex-direction: column; gap: 0.75rem; width: 480px;">
		<Alert variant="info" title="Info">Informational alert.</Alert>
		<Alert variant="success" title="Success">The operation completed.</Alert>
		<Alert variant="warning" title="Warning">Review the change before continuing.</Alert>
		<Alert variant="danger" title="Danger">Something went wrong.</Alert>
	</div>
</Story>
