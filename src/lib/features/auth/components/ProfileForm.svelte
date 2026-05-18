<script lang="ts">
	import { TextField } from '$lib/components/form';
	import { Alert, Button } from '$ui';
	import { session } from '$features/auth/stores/session.svelte';
	import { myProfileQuery, updateMyProfileMutation } from '$features/auth/queries';
	import { ValidationError } from '$api/errors';
	import type { UpdateProfileRequest } from '$features/auth/types';
	import { displayName } from '$features/auth/view-models';

	/**
	 * ProfileForm — read-only name + email block at the top (admin-
	 * controlled fields), editable designation / department /
	 * status_message below. Save calls updateMyProfileMutation.
	 *
	 * Loading state is the responsibility of the parent route —
	 * this component renders only when the profile query has data.
	 */

	const membershipId = $derived(session.principal?.membershipId ?? '');
	const profileQuery = $derived(myProfileQuery(membershipId));
	const profileData = $derived(profileQuery.data ?? null);
	const mutation = $derived(updateMyProfileMutation(membershipId));

	let designation = $state('');
	let department = $state('');
	let statusMessage = $state('');
	let fieldErrors = $state<Record<string, string>>({});
	let saveError = $state<string | null>(null);

	$effect(() => {
		if (profileData) {
			designation = profileData.designation;
			department = profileData.department;
			statusMessage = profileData.status_message;
		}
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		saveError = null;
		fieldErrors = {};
		const patch: UpdateProfileRequest = {
			designation: designation.trim(),
			department: department.trim(),
			status_message: statusMessage.trim()
		};
		mutation.mutate(patch, {
			onError: (err) => {
				if (err instanceof ValidationError) {
					fieldErrors = err.fields;
				} else {
					saveError = err instanceof Error ? err.message : 'Failed to save changes';
				}
			}
		});
	}

	const isSaving = $derived(mutation.isPending);
	const dirty = $derived(
		profileData !== null &&
			(designation.trim() !== profileData.designation ||
				department.trim() !== profileData.department ||
				statusMessage.trim() !== profileData.status_message)
	);
</script>

{#if profileData}
	<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
		<!-- Read-only identity block -->
		<section class="stack stack-tight">
			<h2 class="h5">{displayName(profileData)}</h2>
			<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Email</dt>
					<dd class="body-base text-[var(--color-fg)]">{profileData.email}</dd>
				</div>
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Status</dt>
					<dd class="body-base text-[var(--color-fg)] capitalize">{profileData.status}</dd>
				</div>
			</dl>
			<p class="caption text-[var(--color-fg-subtle)]">
				Name + email are managed by your tenant administrator. To change them, ask your admin.
			</p>
		</section>

		<!-- Editable block -->
		<section class="stack stack-tight">
			<h3 class="h6">Workplace</h3>
			<TextField
				label="Designation"
				name="designation"
				bind:value={designation}
				placeholder="e.g. Sales Executive"
				maxlength={120}
				error={fieldErrors.designation}
			/>
			<TextField
				label="Department"
				name="department"
				bind:value={department}
				placeholder="e.g. Sales"
				maxlength={120}
				error={fieldErrors.department}
			/>
			<TextField
				label="Status message"
				name="status_message"
				bind:value={statusMessage}
				placeholder="Optional — shown to teammates"
				maxlength={280}
				error={fieldErrors.status_message}
			/>
		</section>

		{#if saveError}
			<Alert variant="danger">{saveError}</Alert>
		{/if}

		<div class="cluster">
			<Button type="submit" loading={isSaving} disabled={!dirty || isSaving}>Save changes</Button>
		</div>
	</form>
{/if}
