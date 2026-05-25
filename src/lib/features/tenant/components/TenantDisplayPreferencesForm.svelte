<script lang="ts">
	import { Alert, Button } from '$ui';
	import { Select, type SelectOption } from '$form';
	import { updateTenantDisplayPreferencesSchema } from '../schemas';
	import { updateTenantDisplayPreferencesMutation } from '../queries';
	import { useForm } from '$lib/hooks/use-form.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantDisplayPreferencesForm — locale + IANA timezone + date
	 * format + ISO 4217 currency. Each field is a curated dropdown
	 * via the native Select primitive.
	 */

	interface Props {
		tenant: Tenant;
		tenantId: string;
	}

	let { tenant, tenantId }: Props = $props();

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

	const mutation = $derived(updateTenantDisplayPreferencesMutation(tenantId));

	const form = useForm(updateTenantDisplayPreferencesSchema, {
		locale: 'en-IN',
		time_zone: 'Asia/Kolkata',
		date_format: 'dd-MM-yyyy',
		currency: 'INR'
	});

	$effect.pre(() => {
		form.values.locale = tenant.locale ?? 'en-IN';
		form.values.time_zone = tenant.time_zone ?? 'Asia/Kolkata';
		form.values.date_format = tenant.date_format ?? 'dd-MM-yyyy';
		form.values.currency = tenant.currency ?? 'INR';
	});

	async function onSubmit(e: SubmitEvent) {
		await form.submit(e, async (values) => {
			await new Promise<void>((resolve, reject) => {
				mutation.mutate(values, {
					onSuccess: () => resolve(),
					onError: (err) => reject(err)
				});
			});
		});
	}
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Select label="Locale" options={localeOptions} bind:value={form.values.locale} />
		<Select label="Time zone" options={timeZoneOptions} bind:value={form.values.time_zone} />
		<Select label="Date format" options={dateFormatOptions} bind:value={form.values.date_format} />
		<Select label="Currency" options={currencyOptions} bind:value={form.values.currency} />
	</div>

	{#if form.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={form.isSubmitting}>Save changes</Button>
	</div>
</form>
