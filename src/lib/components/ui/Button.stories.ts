import type { Meta, StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';

/**
 * Button — primary CTA primitive with 5 variants (primary / secondary /
 * ghost / danger / link) and 4 sizes (xs / sm / md / lg).
 *
 * Industry refs: Polaris Button, Linear Button, Radix Themes Button.
 */
const meta = {
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
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: { variant: 'primary', children: 'Save changes' }
};

export const Secondary: Story = {
	args: { variant: 'secondary', children: 'Cancel' }
};

export const Ghost: Story = {
	args: { variant: 'ghost', children: 'More options' }
};

export const Danger: Story = {
	args: { variant: 'danger', children: 'Delete account' }
};

export const Loading: Story = {
	args: { variant: 'primary', loading: true, children: 'Saving…' }
};

export const Disabled: Story = {
	args: { variant: 'primary', disabled: true, children: "Can't submit" }
};

export const FullWidth: Story = {
	args: { variant: 'primary', fullWidth: true, children: 'Continue' }
};
