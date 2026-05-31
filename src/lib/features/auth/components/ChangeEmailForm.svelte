<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';
	import { Alert, Button } from '$ui';
	import { TextField } from '$lib/components/form';

	/**
	 * ChangeEmailForm — authenticated email-change request via SvelteKit
	 * form action `?/changeEmail`. The change does NOT apply until the
	 * user clicks the confirmation link emailed to the new address.
	 */
	type FormResult = {
		which?: 'changePassword' | 'changeEmail';
		email?: string;
		fieldError?: string;
		formErrorKey?: string;
		submitted?: boolean;
	};
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	let loading = $state(false);

	const ours = $derived(form?.which === 'changeEmail');
	const submitted = $derived(Boolean(ours && form?.submitted));
	const fieldError = $derived(ours && form?.fieldError ? form.fieldError : null);
	const formErrorKey = $derived(ours && form?.formErrorKey ? form.formErrorKey : null);
	const formError = $derived(formErrorKey ? $_(formErrorKey) : null);
	const initialEmail = $derived(ours && form?.email ? form.email : '');
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
