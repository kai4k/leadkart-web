<script lang="ts">
	import { TextField } from '$lib/components/form';
	import { Alert, Button } from '$ui';
	import { profile } from '$features/auth/stores/profile.svelte';
	import type { UpdateProfileRequest } from '$features/auth/types';
	import { displayName } from '$features/auth/view-models';

	/**
	 * ProfileForm — read-only name + email block at the top (admin-
	 * controlled fields), editable designation / department /
	 * status_message below. Save calls profile.update().
	 *
	 * Loading state is the responsibility of the parent route —
	 * this component renders only when profile.current is non-null.
	 */

	let designation = $state('');
	let department = $state('');
	let statusMessage = $state('');
	let saveError = $state<string | null>(null);
	let saved = $state(false);

	$effect(() => {
		if (profile.current) {
			designation = profile.current.designation;
			department = profile.current.department;
			statusMessage = profile.current.status_message;
		}
	});

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		saved = false;
		saveError = null;
		const patch: UpdateProfileRequest = {
			designation: designation.trim(),
			department: department.trim(),
			status_message: statusMessage.trim()
		};
		try {
			await profile.update(patch);
			saved = true;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Failed to save changes';
		}
	}

	const isSaving = $derived(profile.status === 'saving');
	const dirty = $derived(
		profile.current !== null &&
			(designation.trim() !== profile.current.designation ||
				department.trim() !== profile.current.department ||
				statusMessage.trim() !== profile.current.status_message)
	);
</script>

{#if profile.current}
	<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
		<!-- Read-only identity block -->
		<section class="stack stack-tight">
			<h2 class="h5">{displayName(profile.current)}</h2>
			<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Email</dt>
					<dd class="body-base text-[var(--color-fg)]">{profile.current.email}</dd>
				</div>
				<div>
					<dt class="caption text-[var(--color-fg-muted)]">Status</dt>
					<dd class="body-base text-[var(--color-fg)] capitalize">{profile.current.status}</dd>
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
			/>
			<TextField
				label="Department"
				name="department"
				bind:value={department}
				placeholder="e.g. Sales"
				maxlength={120}
			/>
			<TextField
				label="Status message"
				name="status_message"
				bind:value={statusMessage}
				placeholder="Optional — shown to teammates"
				maxlength={280}
			/>
		</section>

		{#if saveError}
			<Alert variant="danger">{saveError}</Alert>
		{:else if saved}
			<Alert variant="success">Profile updated.</Alert>
		{/if}

		<div class="cluster">
			<Button type="submit" loading={isSaving} disabled={!dirty || isSaving}>Save changes</Button>
		</div>
	</form>
{/if}
