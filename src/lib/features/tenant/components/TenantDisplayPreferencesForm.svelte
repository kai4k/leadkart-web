<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Select, type ActionFormResult, type SelectOption } from '$form';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantDisplayPreferencesForm — locale + IANA timezone + date
	 * format + ISO 4217 currency. Submits via the preferences form action.
	 */
	type Props = { tenant: Tenant; form?: ActionFormResult };
	let { tenant, form }: Props = $props();

	const localeOptions: ReadonlyArray<SelectOption> = [
		{ value: 'en-IN', label: 'English (India)' },
		{ value: 'en-US', label: 'English (United States)' },
		{ value: 'hi-IN', label: 'हिन्दी (India)' }
	];
	const timeZoneOptions: ReadonlyArray<SelectOption> = [
		{ value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, +05:30)' },
		{ value: 'Asia/Dubai', label: 'Asia/Dubai (GST, +04:00)' },
		{ value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, +08:00)' },
		{ value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
		{ value: 'America/New_York', label: 'America/New_York (ET)' },
		{ value: 'UTC', label: 'UTC (Coordinated Universal Time)' }
	];
	const dateFormatOptions: ReadonlyArray<SelectOption> = [
		{ value: 'dd-MM-yyyy', label: '31-12-2026 (dd-MM-yyyy, Indian default)' },
		{ value: 'dd/MM/yyyy', label: '31/12/2026 (dd/MM/yyyy)' },
		{ value: 'MM/dd/yyyy', label: '12/31/2026 (MM/dd/yyyy, US)' },
		{ value: 'yyyy-MM-dd', label: '2026-12-31 (yyyy-MM-dd, ISO 8601)' }
	];
	const currencyOptions: ReadonlyArray<SelectOption> = [
		{ value: 'INR', label: '₹ Indian Rupee (INR)' },
		{ value: 'USD', label: '$ US Dollar (USD)' },
		{ value: 'EUR', label: '€ Euro (EUR)' },
		{ value: 'GBP', label: '£ Pound Sterling (GBP)' },
		{ value: 'AED', label: 'د.إ UAE Dirham (AED)' },
		{ value: 'SGD', label: 'S$ Singapore Dollar (SGD)' }
	];
</script>

<TenantSectionForm
	section="display-preferences"
	result={form}
	successMessage={$_('pages.tenant.form.saved.preferences')}
>
	{#snippet children({ value, fieldError })}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Select
				label="Locale"
				name="locale"
				options={localeOptions}
				value={String(value('locale') ?? tenant.locale ?? 'en-IN')}
				error={fieldError('locale')}
			/>
			<Select
				label="Time zone"
				name="time_zone"
				options={timeZoneOptions}
				value={String(value('time_zone') ?? tenant.time_zone ?? 'Asia/Kolkata')}
				error={fieldError('time_zone')}
			/>
			<Select
				label="Date format"
				name="date_format"
				options={dateFormatOptions}
				value={String(value('date_format') ?? tenant.date_format ?? 'dd-MM-yyyy')}
				error={fieldError('date_format')}
			/>
			<Select
				label="Currency"
				name="currency"
				options={currencyOptions}
				value={String(value('currency') ?? tenant.currency ?? 'INR')}
				error={fieldError('currency')}
			/>
		</div>
	{/snippet}
</TenantSectionForm>
