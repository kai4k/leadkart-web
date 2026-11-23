<script lang="ts">
	import { Select } from '#lib/components/form/index.ts';
	import { PERMISSION_CATALOGUE, requestablePermissions } from '../permissions-catalogue.ts';

	/**
	 * PermissionPicker: one permission, picked from the names Go knows (`PERMISSION_CATALOGUE`), never typed. A typed
	 * name that does not exist is Go's 422 `permission_unknown`; an example in a placeholder that is not a real
	 * permission teaches exactly that mistake.
	 *
	 * `requestableOnly` leaves out what a permission request can never be for (`tenant.admin` and the
	 * platform-reserved names: Go's `permission.IsRequestable`).
	 *
	 * The field anatomy (label, hint, error, required mark) is `Select`'s; each option reads "name: what it allows".
	 */
	type Props = {
		label: string;
		name: string;
		value?: string;
		requestableOnly?: boolean;
		required?: boolean;
		hint?: string;
		error?: string | null;
		disabled?: boolean;
	};

	let {
		label,
		name,
		value = $bindable(''),
		requestableOnly = false,
		required = false,
		hint,
		error,
		disabled = false
	}: Props = $props();

	const options = $derived(
		(requestableOnly ? requestablePermissions() : PERMISSION_CATALOGUE).map((entry) => ({
			value: entry.name,
			label: `${entry.name}: ${entry.description}`
		}))
	);
</script>

<Select
	{label}
	{name}
	bind:value
	{options}
	{required}
	{hint}
	{error}
	{disabled}
	placeholder="Pick a permission"
/>
