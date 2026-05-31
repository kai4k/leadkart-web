<script lang="ts">
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
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
		errors?: Record<string, string | string[] | undefined>;
		bannerError?: string;
		success?: boolean;
	};
	type Props = { tenant: Tenant; form?: FormResult };
	let { tenant, form }: Props = $props();

	let loading = $state(false);

	function err(field: string): string | undefined {
		const v = form?.errors?.[field];
		if (typeof v === 'string') return v;
		if (Array.isArray(v)) return v[0];
		return undefined;
	}

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
	use:enhance={() => {
		loading = true;
		return async ({ update }) => {
			await update();
			loading = false;
		};
	}}
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

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Contact details saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
