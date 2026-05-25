import type { Meta, StoryObj } from '@storybook/svelte';
import Alert from './Alert.svelte';

/**
 * Alert — in-flow status banner with 4 semantic variants.
 *
 * Industry refs: Polaris Banner, Linear notice, Material Snackbar (in-flow).
 */
const meta: Meta<Alert> = {
	title: 'UI/Alert',
	component: Alert,
	tags: ['autodocs'],
	argTypes: {
		variant: { control: 'select', options: ['info', 'success', 'warning', 'danger'] },
		title: { control: 'text' },
		dismissible: { control: 'boolean' }
	},
	args: { variant: 'info', title: '', dismissible: false }
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
	args: { variant: 'info', children: 'Heads up — your trial expires in 7 days.' }
};
export const Success: Story = {
	args: { variant: 'success', children: 'Member added.', title: 'Done' }
};
export const Warning: Story = {
	args: {
		variant: 'warning',
		title: 'Unsaved changes',
		children: 'You have unsaved edits. Save them before leaving the page.'
	}
};
export const Danger: Story = {
	args: {
		variant: 'danger',
		title: 'Save failed',
		children: 'A membership already exists for this email in this tenant.'
	}
};
export const Dismissible: Story = {
	args: {
		variant: 'info',
		title: 'Tip',
		dismissible: true,
		children: 'Press / to open the search palette.'
	}
};
