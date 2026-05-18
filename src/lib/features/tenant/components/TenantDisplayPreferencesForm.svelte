<script lang="ts">
	import { ValidationError } from '$api/errors';
	import { Alert, Button } from '$ui';
	import { Select, type SelectOption } from '$form';
	import { updateTenantDisplayPreferencesSchema } from '../schemas';
	import { updateTenantDisplayPreferencesMutation } from '../queries';
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

	let locale = $state('');
	let timeZone = $state('');
	let dateFormat = $state('');
	let currency = $state('');
	let formError = $state<string | null>(null);
	let errorRegion: HTMLElement | undefined = $state();

	$effect.pre(() => {
		locale = tenant.locale ?? 'en-IN';
		timeZone = tenant.time_zone ?? 'Asia/Kolkata';
		dateFormat = tenant.date_format ?? 'dd-MM-yyyy';
		currency = tenant.currency ?? 'INR';
	});

	const mutation = $derived(updateTenantDisplayPreferencesMutation(tenantId));

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;

		const parsed = updateTenantDisplayPreferencesSchema.safeParse({
			locale,
			time_zone: timeZone,
			date_format: dateFormat,
			currency
		});
		if (!parsed.success) {
			formError = 'Some values were rejected. Please check the highlighted fields.';
			return;
		}

		mutation.mutate(parsed.data, {
			onError: (err) => {
				if (err instanceof ValidationError) {
					formError = 'Some values were rejected by the server.';
				} else {
					formError =
						err instanceof Error ? err.message : 'Could not save changes. Please try again.';
				}
				queueMicrotask(() => errorRegion?.focus());
			}
		});
	}

	const isSaving = $derived(mutation.isPending);
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<Select label="Locale" options={localeOptions} bind:value={locale} />
		<Select label="Time zone" options={timeZoneOptions} bind:value={timeZone} />
		<Select label="Date format" options={dateFormatOptions} bind:value={dateFormat} />
		<Select label="Currency" options={currencyOptions} bind:value={currency} />
	</div>

	{#if formError}
		<div bind:this={errorRegion} tabindex="-1">
			<Alert variant="danger">{formError}</Alert>
		</div>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={isSaving}>Save changes</Button>
	</div>
</form>
