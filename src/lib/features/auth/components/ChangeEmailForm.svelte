<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { Alert } from '$ui';
	import { ActionForm, TextField, type ActionFormResult } from '$form';

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
	>
		{#snippet children({ fieldError, value })}
			<TextField
				label={$_('auth.changeEmail.newEmail')}
				name="new_email"
				format="email"
				required
				value={String(value('email') ?? '')}
				error={fieldError('email')}
			/>
		{/snippet}
	</ActionForm>
{/if}
