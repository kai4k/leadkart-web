<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { TextField, type ActionFormResult } from '$form';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantContactForm — admin phone + postal address via the contact form action. Nested address
	 * fields use the `address.field` name pattern; the action reconstructs the nested object and
	 * `value('address.street')` reads what a refused submit typed.
	 */
	type Props = { tenant: Tenant; form?: ActionFormResult };
	let { tenant, form }: Props = $props();
</script>

<TenantSectionForm
	section="admin-contact"
	result={form}
	successMessage={$_('pages.tenant.form.saved.contact')}
>
	{#snippet children({ fieldError, value })}
		<TextField
			label="Admin phone"
			name="phone"
			hint="The number drug-control inspectors and platform notifications reach you on."
			type="tel"
			autocomplete="tel"
			value={String(value('phone') ?? tenant.admin_phone ?? '')}
			error={fieldError('phone')}
		/>

		<fieldset class="stack stack-tight">
			<legend class="label text-foreground">Postal address</legend>

			<TextField
				label="Street"
				name="address.street"
				srLabel
				placeholder="Building, street, landmark"
				autocomplete="street-address"
				value={String(value('address.street') ?? tenant.admin_address.street ?? '')}
			/>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<TextField
					label="City"
					name="address.city"
					autocomplete="address-level2"
					value={String(value('address.city') ?? tenant.admin_address.city ?? '')}
				/>
				<TextField
					label="District"
					name="address.district"
					value={String(value('address.district') ?? tenant.admin_address.district ?? '')}
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<TextField
					label="State"
					name="address.state"
					autocomplete="address-level1"
					value={String(value('address.state') ?? tenant.admin_address.state ?? '')}
				/>
				<TextField
					label="State code"
					name="address.state_code"
					hint="2-digit GST state code"
					autocomplete="off"
					value={String(value('address.state_code') ?? tenant.admin_address.state_code ?? '')}
				/>
				<TextField
					label="Pincode"
					name="address.pincode"
					autocomplete="postal-code"
					value={String(value('address.pincode') ?? tenant.admin_address.pincode ?? '')}
				/>
			</div>
		</fieldset>
	{/snippet}
</TenantSectionForm>
