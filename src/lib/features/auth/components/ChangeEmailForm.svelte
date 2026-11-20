<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { bannerText, fieldText, readFailure } from '#lib/utils/form-failure.ts';
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { TextField } from '#lib/components/form/index.ts';

	/**
	 * ChangeEmailForm — authenticated email-change request via SvelteKit
	 * form action `?/changeEmail`. The change does NOT apply until the
	 * user clicks the confirmation link emailed to the new address.
	 */
	type FormResult = {
		which?: 'changePassword' | 'changeEmail';
		values?: { email?: string };
		fieldKeys?: Record<string, string>;
		fieldMessages?: Record<string, string>;
		formErrorKey?: string | null;
		submitted?: boolean;
	};
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	let loading = $state(false);

	const ours = $derived(form?.which === 'changeEmail');
	const submitted = $derived(Boolean(ours && form?.submitted));
	const failure = $derived(ours ? readFailure<{ email?: string }>(form) : null);
	const fieldError = $derived(fieldText(failure, 'email', $_) ?? null);
	const formError = $derived(bannerText(failure, $_));
	const initialEmail = $derived(failure?.values.email ?? '');
</script>

{#if submitted}
	<Alert variant="success">
		<p>{$_('auth.changeEmail.successCopy')}</p>
	</Alert>
{:else}
	<form
		class="stack"
		method="POST"
		action="?/changeEmail"
		novalidate
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<TextField
			label={$_('auth.changeEmail.newEmail')}
			name="new_email"
			type="email"
			autocomplete="email"
			required
			value={initialEmail}
			error={fieldError ?? undefined}
		/>
		{#if formError}
			<Alert variant="danger">{formError}</Alert>
		{/if}
		<div class="form-footer">
			<Button type="submit" {loading}>
				{$_('auth.changeEmail.submit')}
			</Button>
		</div>
	</form>
{/if}
