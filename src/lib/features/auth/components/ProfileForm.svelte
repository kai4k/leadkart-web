<script lang="ts">
	import { enhance } from '$app/forms';
	import { _ } from 'svelte-i18n';
	import { fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { ScopeContextField, TextField } from '#lib/components/form/index.ts';
	import { Alert, Button, DescriptionList } from '$ui';
	import { displayName, userStatus } from '$features/auth/view-models';
	import type { UserDto } from '$features/auth/types';

	/**
	 * ProfileForm — Svelte canon form-shaped route. The page at
	 * /settings/account/profile owns the load + action; this component
	 * is a pure renderer over the loaded `profile` + form action
	 * result.
	 */
	type Values = { designation: string; department: string; status_message: string };
	type FormResult = {
		values?: Values;
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
		success?: boolean;
	};
	type Props = { profile: UserDto; form?: FormResult };
	let { profile, form }: Props = $props();

	let loading = $state(false);

	const failure = $derived(readFailure<Partial<Values>>(form));
	const fieldErrors = $derived({
		designation: fieldText(failure, 'designation', $_),
		department: fieldText(failure, 'department', $_),
		status_message: fieldText(failure, 'status_message', $_)
	});

	const values = $derived(
		form?.values ?? {
			designation: profile.designation,
			department: profile.department,
			status_message: profile.status_message
		}
	);
</script>

<form
	class="stack stack-relaxed"
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
	<ScopeContextField />

	<!-- Read-only identity block -->
	<section class="stack stack-tight">
		<h2 class="h5">{displayName(profile)}</h2>
		<DescriptionList
			items={[
				{ label: 'Email', value: profile.email },
				{ label: 'Status', value: userStatus(profile.status).label }
			]}
		/>
		<p class="caption text-fg-muted">
			Name + email are managed by your tenant administrator. To change them, ask your admin.
		</p>
	</section>

	<!-- Editable block -->
	<section class="stack stack-tight">
		<h3 class="h6">Workplace</h3>
		<TextField
			label="Designation"
			name="designation"
			value={values.designation}
			placeholder="e.g. Sales Executive"
			maxlength={120}
			error={fieldErrors.designation}
		/>
		<TextField
			label="Department"
			name="department"
			value={values.department}
			placeholder="e.g. Sales"
			maxlength={120}
			error={fieldErrors.department}
		/>
		<TextField
			label="Status message"
			name="status_message"
			value={values.status_message}
			placeholder="Optional — shown to teammates"
			maxlength={280}
			error={fieldErrors.status_message}
		/>
	</section>

	{#if form?.formErrorKey}
		<Alert variant="danger">{$_(form.formErrorKey)}</Alert>
	{:else if form?.success}
		<Alert variant="success">Profile saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
