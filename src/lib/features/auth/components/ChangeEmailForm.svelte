<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';
	import { requestEmailChange } from '../api';
	import { Alert, Button } from '$ui';
	import { TextField } from '$lib/components/form';

	/**
	 * ChangeEmailForm — authenticated email-change request form.
	 *
	 * The change does NOT apply until the user clicks the confirmation
	 * link emailed to the new address. We surface success copy that
	 * makes this two-step nature obvious.
	 *
	 * Error mapping:
	 *   422 invalid_email → field error
	 *   409 email_in_use  → top banner
	 *   network / other   → top banner
	 */

	const schema = z.string().min(1, 'Email is required').email('Invalid email format');

	let newEmail = $state('');
	let fieldError = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let loading = $state(false);
	let submitted = $state(false);

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		fieldError = null;
		formError = null;

		const parsed = schema.safeParse(newEmail);
		if (!parsed.success) {
			fieldError = parsed.error.issues[0]?.message ?? 'Invalid email';
			return;
		}

		loading = true;
		try {
			await requestEmailChange({ new_email: parsed.data });
			submitted = true;
		} catch (err) {
			const status = (err as { status?: number }).status;
			if (status === 409) {
				formError = $_('auth.changeEmail.errors.inUse');
			} else if (status === 422) {
				fieldError = $_('auth.changeEmail.errors.invalid');
			} else {
				formError = (err as Error).message ?? $_('auth.errors.unexpected');
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if submitted}
	<Alert variant="success">
		<p>{$_('auth.changeEmail.successCopy')}</p>
	</Alert>
{:else}
	<form class="stack" onsubmit={onSubmit} novalidate>
		<TextField
			label={$_('auth.changeEmail.newEmail')}
			type="email"
			autocomplete="email"
			required
			bind:value={newEmail}
			error={fieldError ?? undefined}
		/>
		{#if formError}
			<Alert variant="danger">{formError}</Alert>
		{/if}
		<Button type="submit" {loading}>
			{loading ? $_('common.loading') : $_('auth.changeEmail.submit')}
		</Button>
	</form>
{/if}
