<script lang="ts">
	import { enhance } from '$app/forms';
	import { TextField } from '$lib/components/form';
	import { Alert, Button } from '$ui';
	import { displayName } from '$features/auth/view-models';
	import type { UserDto } from '$features/auth/types';

	/**
	 * ProfileForm — Svelte canon form-shaped route. The page at
	 * /settings/account/profile owns the load + action; this component
	 * is a pure renderer over the loaded `profile` + form action
	 * result.
	 */
	type FormResult = {
		values?: { designation: string; department: string; status_message: string };
		errors?: Record<string, string[] | undefined> | Record<string, string>;
		bannerError?: string;
		success?: boolean;
	};
	type Props = { profile: UserDto; form?: FormResult };
	let { profile, form }: Props = $props();

	let loading = $state(false);

	function readError(field: string): string | undefined {
		const errs = form?.errors;
		if (!errs) return undefined;
		const value = (errs as Record<string, unknown>)[field];
		if (typeof value === 'string') return value;
		if (Array.isArray(value)) return value[0];
		return undefined;
	}

	const fieldErrors = $derived({
		designation: readError('designation'),
		department: readError('department'),
		status_message: readError('status_message')
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
	<!-- Read-only identity block -->
	<section class="stack stack-tight">
		<h2 class="h5">{displayName(profile)}</h2>
		<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
			<div>
				<dt class="caption text-fg-muted">Email</dt>
				<dd class="body-base text-fg">{profile.email}</dd>
			</div>
			<div>
				<dt class="caption text-fg-muted">Status</dt>
				<dd class="body-base text-fg capitalize">{profile.status}</dd>
			</div>
		</dl>
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

	{#if form?.bannerError}
		<Alert variant="danger">{form.bannerError}</Alert>
	{:else if form?.success}
		<Alert variant="success">Profile saved.</Alert>
	{/if}

	<div class="form-footer">
		<Button type="submit" {loading}>Save changes</Button>
	</div>
</form>
