<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { Select, type SelectOption } from '$form';
	import type { Tenant } from '../types';

	/**
	 * TenantDisplayPreferencesForm — locale + IANA timezone + date
	 * format + ISO 4217 currency. Submits via SvelteKit form action.
	 */
	type FormResult = {
		values?: { locale: string; time_zone: string; date_format: string; currency: string };
		errors?: Record<string, string | string[] | undefined>;
		bannerError?: string;
		success?: boolean;
	};
	type Props = { tenant: Tenant; form?: FormResult };
	let { tenant, form }: Props = $props();

	let loading = $state(false);

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

	const values = $derived(
		form?.values ?? {
			locale: tenant.locale ?? 'en-IN',
			time_zone: tenant.time_zone ?? 'Asia/Kolkata',
			date_format: tenant.date_format ?? 'dd-MM-yyyy',
			currency: tenant.currency ?? 'INR'
		}
	);
</script>

<form
	class="stack"
	method="POST"
	novalidate
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	}}
>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Select label="Locale" name="locale" options={localeOptions} value={values.locale} />
		<Select label="Time zone" name="time_zone" options={timeZoneOptions} value={values.time_zone} />
		<Select
			label="Date format"
			name="date_format"
			options={dateFormatOptions}
			value={values.date_format}
		/>
		<Select label="Currency" name="currency" options={currencyOptions} value={values.currency} />
	</div>

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Preferences saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
