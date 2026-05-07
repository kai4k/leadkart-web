<script lang="ts">
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantAdminContactSchema } from '../schemas';
	import { tenant as tenantStore } from '../stores/tenant.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantContactForm — admin phone + postal address. Submits as a
	 * single PATCH /admin-contact body where the address is a nested
	 * object the leadkart-go aggregate accepts atomically.
	 *
	 * Layout: phone full-width; address fields grouped under a
	 * fieldset (a11y best practice for multi-field address blocks
	 * per WAI-ARIA Authoring Practices). Responsive grid stacks on
	 * mobile, 2-col / 3-col on sm+.
	 *
	 * State code remains a TextField for now; commit 9 introduces a
	 * Select primitive (driving locale / timezone / currency on the
	 * Display Preferences form) and a follow-up could swap state_code
	 * to that primitive once the Indian-state-code catalogue lands.
	 */

	interface Props {
		tenant: Tenant;
	}

	let { tenant }: Props = $props();

	let phone = $state('');
	let street = $state('');
	let city = $state('');
	let district = $state('');
	let addressState = $state('');
	let stateCode = $state('');
	let pincode = $state('');
	let saving = $state(false);
	let formError = $state<string | null>(null);
	let success = $state(false);
	let errorRegion: HTMLElement | undefined = $state();

	$effect.pre(() => {
		phone = tenant.admin_phone ?? '';
		street = tenant.admin_address.street ?? '';
		city = tenant.admin_address.city ?? '';
		district = tenant.admin_address.district ?? '';
		addressState = tenant.admin_address.state ?? '';
		stateCode = tenant.admin_address.state_code ?? '';
		pincode = tenant.admin_address.pincode ?? '';
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		formError = null;
		success = false;

		const parsed = updateTenantAdminContactSchema.safeParse({
			phone: phone.trim(),
			address: {
				street: street.trim(),
				city: city.trim(),
				district: district.trim(),
				state: addressState.trim(),
				state_code: stateCode.trim(),
				pincode: pincode.trim()
			}
		});
		if (!parsed.success) {
			formError = 'Some values were rejected. Please check the highlighted fields.';
			return;
		}

		saving = true;
		try {
			await tenantStore.updateAdminContact(parsed.data);
			success = true;
		} catch (err) {
			formError =
				isApiError(err) && err.status === 422
					? err.message || 'The values entered were rejected by the server.'
					: 'Could not save changes. Please try again.';
			queueMicrotask(() => errorRegion?.focus());
		} finally {
			saving = false;
		}
	}
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<TextField
		label="Admin phone"
		hint="The number drug-control inspectors and platform notifications reach you on."
		type="tel"
		autocomplete="tel"
		bind:value={phone}
	/>

	<fieldset class="stack stack-tight">
		<legend class="body-sm font-medium text-[var(--color-fg)]">Postal address</legend>

		<TextField
			label="Street"
			srLabel
			placeholder="Building, street, landmark"
			autocomplete="street-address"
			bind:value={street}
		/>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<TextField label="City" autocomplete="address-level2" bind:value={city} />
			<TextField label="District" bind:value={district} />
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<TextField label="State" autocomplete="address-level1" bind:value={addressState} />
			<TextField
				label="State code"
				hint="2-digit GST state code"
				autocomplete="off"
				bind:value={stateCode}
			/>
			<TextField label="Pincode" autocomplete="postal-code" bind:value={pincode} />
		</div>
	</fieldset>

	{#if formError}
		<div bind:this={errorRegion} tabindex="-1">
			<Alert variant="danger">{formError}</Alert>
		</div>
	{:else if success}
		<Alert variant="success">Contact details updated.</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={saving}>Save changes</Button>
	</div>
</form>
