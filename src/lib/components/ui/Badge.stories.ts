import type { Meta, StoryObj } from '@storybook/svelte';
import Badge from './Badge.svelte';

/**
 * Badge — small status / counter pill. 6 semantic variants × 3 appearances
 * (soft / solid / outline) × 2 sizes (sm / md).
 *
 * Industry refs: Polaris Badge, Linear status pill, Atlassian Lozenge.
 */
const meta: Meta<Badge> = {
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
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { variant: 'neutral', children: 'Draft' } };
export const Success: Story = { args: { variant: 'success', children: 'Active' } };
export const Warning: Story = { args: { variant: 'warning', children: 'Pending' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Suspended' } };
export const Info: Story = { args: { variant: 'info', children: 'New' } };
export const Brand: Story = { args: { variant: 'brand', children: 'Premium' } };
export const Solid: Story = {
	args: { variant: 'success', appearance: 'solid', children: 'Solid' }
};
export const Outline: Story = {
	args: { variant: 'danger', appearance: 'outline', children: 'Outline' }
};
export const SmallSize: Story = {
	args: { variant: 'info', size: 'sm', children: 'Compact' }
};
