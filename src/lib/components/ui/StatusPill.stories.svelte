<script context="module" lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StatusPill from './StatusPill.svelte';

	/**
	 * StatusPill — read-only or interactive status indicator.
	 *
	 * Each option carries a variant (Badge colour) + label; interactive
	 * mode lets the user click to change status (consumer-controlled
	 * onChange handler).
	 *
	 * Industry refs: Linear issue-status pill, GitHub PR status, Stripe
	 * subscription-state chip.
	 */
	const { Story } = defineMeta({
		title: 'UI/StatusPill',
		component: StatusPill,
		tags: ['autodocs']
	});

	const ORDER_STATUS = [
		{ value: 'quotation_draft', label: 'Quotation draft', variant: 'neutral' as const },
		{ value: 'approved', label: 'Approved', variant: 'info' as const },
		{ value: 'confirmed', label: 'Confirmed', variant: 'success' as const },
		{ value: 'cancelled', label: 'Cancelled', variant: 'danger' as const }
	];
</script>

<Story name="Quotation draft (read-only)">
	<StatusPill value="quotation_draft" options={ORDER_STATUS} onChange={() => {}} disabled />
</Story>

<Story name="Approved">
	<StatusPill value="approved" options={ORDER_STATUS} onChange={() => {}} />
</Story>

<Story name="Confirmed">
	<StatusPill value="confirmed" options={ORDER_STATUS} onChange={() => {}} />
</Story>

<Story name="Cancelled (danger)">
	<StatusPill value="cancelled" options={ORDER_STATUS} onChange={() => {}} />
</Story>

<Story name="All states — column">
	<div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
		<StatusPill value="quotation_draft" options={ORDER_STATUS} onChange={() => {}} />
		<StatusPill value="approved" options={ORDER_STATUS} onChange={() => {}} />
		<StatusPill value="confirmed" options={ORDER_STATUS} onChange={() => {}} />
		<StatusPill value="cancelled" options={ORDER_STATUS} onChange={() => {}} />
	</div>
</Story>
