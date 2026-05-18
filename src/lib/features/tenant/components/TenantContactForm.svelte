<script lang="ts">
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';
	import { updateTenantAdminContactSchema } from '../schemas';
	import { updateTenantAdminContactMutation } from '../queries';
	import { useForm } from '$lib/utils/use-form.svelte';
	import type { Tenant } from '../types';

	/**
	 * TenantContactForm — admin phone + postal address. Submits as a
	 * single PATCH /admin-contact body where the address is a nested
	 * object the leadkart-go aggregate accepts atomically.
	 */

	interface Props {
		tenant: Tenant;
		tenantId: string;
	}

	let { tenant, tenantId }: Props = $props();

	const mutation = $derived(updateTenantAdminContactMutation(tenantId));

	const form = useForm(updateTenantAdminContactSchema, {
		phone: '',
		address: {
			street: '',
			city: '',
			district: '',
			state: '',
			state_code: '',
			pincode: ''
		}
	});

	$effect.pre(() => {
		form.values.phone = tenant.admin_phone ?? '';
		form.values.address = {
			street: tenant.admin_address.street ?? '',
			city: tenant.admin_address.city ?? '',
			district: tenant.admin_address.district ?? '',
			state: tenant.admin_address.state ?? '',
			state_code: tenant.admin_address.state_code ?? '',
			pincode: tenant.admin_address.pincode ?? ''
		};
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
	<TextField
		label="Admin phone"
		hint="The number drug-control inspectors and platform notifications reach you on."
		type="tel"
		autocomplete="tel"
		bind:value={form.values.phone}
		error={form.errors.phone}
	/>

	<fieldset class="stack stack-tight">
		<legend class="label text-[var(--color-fg)]">Postal address</legend>

		<TextField
			label="Street"
			srLabel
			placeholder="Building, street, landmark"
			autocomplete="street-address"
			bind:value={form.values.address.street}
		/>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<TextField label="City" autocomplete="address-level2" bind:value={form.values.address.city} />
			<TextField label="District" bind:value={form.values.address.district} />
		</div>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
			<TextField
				label="State"
				autocomplete="address-level1"
				bind:value={form.values.address.state}
			/>
			<TextField
				label="State code"
				hint="2-digit GST state code"
				autocomplete="off"
				bind:value={form.values.address.state_code}
			/>
			<TextField
				label="Pincode"
				autocomplete="postal-code"
				bind:value={form.values.address.pincode}
			/>
		</div>
	</fieldset>

	{#if form.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={form.isSubmitting}>Save changes</Button>
	</div>
</form>
