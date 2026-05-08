<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { requestEmailChange } from '../api';
	import { requestEmailChangeSchema } from '../schemas';
	import { isApiError } from '$api/client';
	import { Alert, Button } from '$ui';
	import { TextField } from '$form';

	/**
	 * RequestEmailChangeForm — kicks off the email-change flow. Server
	 * emails a confirmation link to the NEW address; the recipient
	 * clicks → confirmEmailChange runs anonymously with the token at
	 * /confirm-email-change.
	 *
	 * Until the user clicks the link, their CURRENT email keeps
	 * working — change is two-phase + reversible until confirmation.
	 *
	 * Error mapping:
	 *   400 invalid_email                → field error (server msg)
	 *   400 email_change_rejected        → field error (server msg —
	 *                                      domain rules, e.g. blocked
	 *                                      domain)
	 *   409 email_already_taken          → field error (server msg)
	 *   network / other                  → top banner
	 */

	let newEmail = $state('');
	let saving = $state(false);
	let bannerError = $state<string | null>(null);
	let success = $state(false);
	let fieldErrors = $state<{ new_email?: string }>({});
	let bannerRegion: HTMLElement | undefined = $state();

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		bannerError = null;
		fieldErrors = {};
		success = false;

		const parsed = requestEmailChangeSchema.safeParse({ new_email: newEmail });
		if (!parsed.success) {
			fieldErrors = { new_email: parsed.error.flatten().fieldErrors.new_email?.[0] };
			return;
		}

		saving = true;
		try {
			await requestEmailChange(parsed.data);
			success = true;
		} catch (err) {
			if (isApiError(err)) {
				if (err.status === 409) {
					fieldErrors = {
						new_email: $_('account.security.changeEmail.errors.alreadyTaken')
					};
				} else if (err.status === 400) {
					fieldErrors = {
						new_email: err.message || $_('account.security.changeEmail.errors.generic')
					};
				} else {
					bannerError = $_('account.security.changeEmail.errors.generic');
				}
			} else {
				bannerError = $_('account.security.changeEmail.errors.generic');
			}
			queueMicrotask(() => bannerRegion?.focus());
		} finally {
			saving = false;
		}
	}
</script>

<form class="stack" onsubmit={onSubmit} novalidate>
	<TextField
		label={$_('account.security.changeEmail.newEmail')}
		hint={$_('account.security.changeEmail.newEmailHint')}
		type="email"
		autocomplete="email"
		required
		bind:value={newEmail}
		error={fieldErrors.new_email}
	/>

	{#if bannerError}
		<div bind:this={bannerRegion} tabindex="-1">
			<Alert variant="danger">{bannerError}</Alert>
		</div>
	{:else if success}
		<Alert variant="success">{$_('account.security.changeEmail.success')}</Alert>
	{/if}

	<div class="cluster justify-end">
		<Button type="submit" loading={saving}>
			{$_('account.security.changeEmail.submit')}
		</Button>
	</div>
</form>
