<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { TextField, type ActionFormResult } from '#lib/components/form/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import TenantSectionForm from './TenantSectionForm.svelte';
	import type { Tenant } from '../types';
	import { CONTACT_TIDY, validateContact } from '../validate.ts';

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
	tidy={CONTACT_TIDY}
	validate={validateContact}
>
	{#snippet children({ fieldError, value })}
		<TextField
			label="Admin phone"
			name="phone"
			hint="With + and the country code, for example +919876543210."
			format="phone"
			value={String(value('phone') ?? tenant.admin_phone ?? '')}
			error={fieldError('phone')}
		/>

		<fieldset
			class="stack stack-tight"
			aria-describedby={fieldError('address') ? 'tenant-address-error' : undefined}
		>
			<legend class="label text-foreground">Postal address</legend>
			<!-- the whole-address fallback (`invalid_address`): a refusal that names no part has no control to sit under -->
			{#if fieldError('address')}
				<Field.Error id="tenant-address-error">{fieldError('address')}</Field.Error>
			{/if}

			<TextField
				label="Street"
				name="address.street"
				srLabel
				placeholder="Building, street, landmark"
				autocomplete="street-address"
				value={String(value('address.street') ?? tenant.admin_address.street ?? '')}
				error={fieldError('address.street')}
			/>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<TextField
					label="City"
					name="address.city"
					autocomplete="address-level2"
					value={String(value('address.city') ?? tenant.admin_address.city ?? '')}
					error={fieldError('address.city')}
				/>
				<TextField
					label="District"
					name="address.district"
					value={String(value('address.district') ?? tenant.admin_address.district ?? '')}
					error={fieldError('address.district')}
				/>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
				<TextField
					label="State"
					name="address.state"
					autocomplete="address-level1"
					value={String(value('address.state') ?? tenant.admin_address.state ?? '')}
					error={fieldError('address.state')}
				/>
				<TextField
					label="State code"
					name="address.state_code"
					hint="Up to 4 characters, for example MH."
					format="code"
					autocapitalize="characters"
					value={String(value('address.state_code') ?? tenant.admin_address.state_code ?? '')}
					error={fieldError('address.state_code')}
				/>
				<TextField
					label="Pincode"
					name="address.pincode"
					format="pincode"
					value={String(value('address.pincode') ?? tenant.admin_address.pincode ?? '')}
					error={fieldError('address.pincode')}
				/>
			</div>
		</fieldset>
	{/snippet}
</TenantSectionForm>
