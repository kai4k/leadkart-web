<script lang="ts">
	import { TextField } from '$lib/components/form';
	import { Alert, Button } from '$ui';
	import {
		myCapabilitiesQuery,
		myProfileQuery,
		updateMyProfileMutation
	} from '$features/auth/queries';
	import { updateProfileRequestSchema } from '$features/auth/schemas';
	import { useForm } from '$lib/utils/use-form.svelte';
	import { displayName } from '$features/auth/view-models';

	/**
	 * ProfileForm — read-only name + email block at the top (admin-
	 * controlled fields), editable designation / department /
	 * status_message below. Backed by useForm + updateMyProfileMutation.
	 */

	const capsQuery = myCapabilitiesQuery();
	const membershipId = $derived(capsQuery.data?.membership_id ?? '');
	const profileQuery = $derived(myProfileQuery(membershipId));
	const profileData = $derived(profileQuery.data ?? null);
	const mutation = $derived(updateMyProfileMutation(membershipId));

	const form = useForm(updateProfileRequestSchema, {
		designation: '',
		department: '',
		status_message: ''
	});

	$effect(() => {
		if (profileData) {
			form.values.designation = profileData.designation;
			form.values.department = profileData.department;
			form.values.status_message = profileData.status_message;
		}
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

	const dirty = $derived(
		profileData !== null &&
			(form.values.designation.trim() !== profileData.designation ||
				form.values.department.trim() !== profileData.department ||
				form.values.status_message.trim() !== profileData.status_message)
	);
</script>

{#if profileData}
	<form class="stack stack-relaxed" onsubmit={onSubmit} novalidate>
		<!-- Read-only identity block -->
		<section class="stack stack-tight">
			<h2 class="h5">{displayName(profileData)}</h2>
			<dl class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
				<div>
					<dt class="caption text-fg-muted">Email</dt>
					<dd class="body-base text-fg">{profileData.email}</dd>
				</div>
				<div>
					<dt class="caption text-fg-muted">Status</dt>
					<dd class="body-base text-fg capitalize">{profileData.status}</dd>
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
				bind:value={form.values.designation}
				placeholder="e.g. Sales Executive"
				maxlength={120}
				error={form.errors.designation}
			/>
			<TextField
				label="Department"
				name="department"
				bind:value={form.values.department}
				placeholder="e.g. Sales"
				maxlength={120}
				error={form.errors.department}
			/>
			<TextField
				label="Status message"
				name="status_message"
				bind:value={form.values.status_message}
				placeholder="Optional — shown to teammates"
				maxlength={280}
				error={form.errors.status_message}
			/>
		</section>

		{#if form.bannerError}
			<Alert variant="danger">{form.bannerError}</Alert>
		{/if}

		<div class="cluster">
			<Button type="submit" loading={form.isSubmitting} disabled={!dirty || form.isSubmitting}
				>Save changes</Button
			>
		</div>
	</form>
{/if}
