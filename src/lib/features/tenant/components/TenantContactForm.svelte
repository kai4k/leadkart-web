<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import TenantSaveFooter from './TenantSaveFooter.svelte';
	import { enhance } from '$app/forms';
	import { withFocusOnFailure } from '#lib/utils/focus-first-invalid.ts';
	import { TextField } from '$form';
	import type { Tenant } from '../types';

	/**
	 * TenantContactForm — admin phone + postal address via SvelteKit
	 * form action. Nested address fields use `name="address.field"`
	 * pattern; the action handler reconstructs the nested object.
	 */
	type FormResult = {
		values?: {
			phone: string;
			address: {
				street?: string;
				city?: string;
				district?: string;
				state?: string;
				state_code?: string;
				pincode?: string;
			};
		};
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
		success?: boolean;
	};
	type Props = { tenant: Tenant; form?: FormResult };
	let { tenant, form }: Props = $props();

	let loading = $state(false);

	const failure = $derived(readFailure(form));
	const err = (field: string) => fieldText(failure, field, $_);

	const values = $derived(
		form?.values ?? {
			phone: tenant.admin_phone ?? '',
			address: {
				street: tenant.admin_address.street ?? '',
				city: tenant.admin_address.city ?? '',
				district: tenant.admin_address.district ?? '',
				state: tenant.admin_address.state ?? '',
				state_code: tenant.admin_address.state_code ?? '',
				pincode: tenant.admin_address.pincode ?? ''
			}
		}
	);
</script>

<form
	class="stack"
	method="POST"
	novalidate
	use:enhance={withFocusOnFailure(() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	})}
>
	<TextField
		label="Admin phone"
		name="phone"
		hint="The number drug-control inspectors and platform notifications reach you on."
		type="tel"
		autocomplete="tel"
		value={values.phone}
		error={err('phone')}
	/>

	<fieldset class="stack stack-tight">
		<legend class="label text-fg">Postal address</legend>

		<TextField
			label="Street"
			name="address.street"
			srLabel
			placeholder="Building, street, landmark"
			autocomplete="street-address"
			value={values.address.street ?? ''}
		/>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<TextField
				label="City"
				name="address.city"
				autocomplete="address-level2"
				value={values.address.city ?? ''}
			/>
			<TextField label="District" name="address.district" value={values.address.district ?? ''} />
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<TextField
				label="State"
				name="address.state"
				autocomplete="address-level1"
				value={values.address.state ?? ''}
			/>
			<TextField
				label="State code"
				name="address.state_code"
				hint="2-digit GST state code"
				autocomplete="off"
				value={values.address.state_code ?? ''}
			/>
			<TextField
				label="Pincode"
				name="address.pincode"
				autocomplete="postal-code"
				value={values.address.pincode ?? ''}
			/>
		</div>
	</fieldset>

	<TenantSaveFooter
		{form}
		{loading}
		section="admin-contact"
		successMessage="Contact details saved."
	/>
</form>
