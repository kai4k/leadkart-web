<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert } from '#lib/components/ui/index.ts';
	import { ActionForm, TextField, type ActionFormResult } from '#lib/components/form/index.ts';
	import { session } from '../stores/session.svelte.ts';

	/**
	 * ChangeEmailForm: authenticated email-change request via the form action `?/changeEmail`. The change does NOT
	 * apply until the user clicks the confirmation link emailed to the new address.
	 */
	type FormResult = ActionFormResult & {
		which?: 'changePassword' | 'changeEmail';
		submitted?: boolean;
	};
	type Props = { form?: FormResult };
	let { form }: Props = $props();

	const ours = $derived(form?.which === 'changeEmail' ? form : null);
	const submitted = $derived(Boolean(ours?.submitted));

	// Go answers "sent" to the address the account already has and sends nothing (email_change.go compares the
	// canonical, lower-case forms): the person would wait for a link that never comes. It is their own address, so
	// saying so reveals nothing. Checked here only; the action is unchanged.
	const canonical = (email: string) => email.trim().toLowerCase();
	const validate = (values: Record<string, string>): Record<string, string> => {
		const current = canonical(session.principal?.email ?? '');
		return current !== '' && canonical(values.new_email ?? '') === current
			? { new_email: 'auth.changeEmail.errors.sameAsCurrent' }
			: {};
	};
</script>

{#if submitted}
	<Alert variant="success">
		<p>{$_('auth.changeEmail.successCopy')}</p>
	</Alert>
{:else}
	<ActionForm
		id="change-email-form"
		action="?/changeEmail"
		result={ours}
		submitLabel={$_('auth.changeEmail.submit')}
		{validate}
	>
		{#snippet children({ fieldError, value })}
			<TextField
				label={$_('auth.changeEmail.newEmail')}
				name="new_email"
				format="email"
				required
				value={String(value('email') ?? '')}
				error={fieldError('new_email') ?? fieldError('email')}
			/>
		{/snippet}
	</ActionForm>
{/if}
