<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ActionForm, TextField, type ActionFormResult } from '#lib/components/form/index.ts';
	import { DescriptionList } from '$ui';
	import { displayName, userStatus } from '$features/auth/view-models';
	import type { UserDto } from '$features/auth/types';

	/**
	 * ProfileForm: the page at /settings/account/profile owns the load + action; this component is a pure renderer
	 * over the loaded `profile` + the action's result.
	 */
	type Props = { profile: UserDto; form?: ActionFormResult };
	let { profile, form }: Props = $props();
</script>

<ActionForm
	id="profile-form"
	result={form}
	relaxed
	guardLeave
	successMessage={$_('account.profileSaved')}
	submitLabel={$_('pages.tenant.form.save')}
>
	{#snippet children({ fieldError, value })}
		<!-- Read-only identity block -->
		<section class="stack stack-tight">
			<h2 class="h5">{displayName(profile)}</h2>
			<DescriptionList
				items={[
					{ label: 'Email', value: profile.email },
					{ label: 'Status', value: userStatus(profile.status).label }
				]}
			/>
			<p class="caption text-muted-foreground">
				Name + email are managed by your tenant administrator. To change them, ask your admin.
			</p>
		</section>

		<!-- Editable block -->
		<section class="stack stack-tight">
			<h3 class="h6">Workplace</h3>
			<TextField
				label="Designation"
				name="designation"
				value={String(value('designation') ?? profile.designation)}
				placeholder="e.g. Sales Executive"
				maxlength={120}
				error={fieldError('designation')}
			/>
			<TextField
				label="Department"
				name="department"
				value={String(value('department') ?? profile.department)}
				placeholder="e.g. Sales"
				maxlength={120}
				error={fieldError('department')}
			/>
			<TextField
				label="Status message"
				name="status_message"
				value={String(value('status_message') ?? profile.status_message)}
				placeholder="Optional — shown to teammates"
				maxlength={280}
				error={fieldError('status_message')}
			/>
		</section>
	{/snippet}
</ActionForm>
