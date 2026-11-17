<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ResetPasswordForm } from '$features/auth';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{$_('auth.resetPassword.title')} · LeadKart</title>
</svelte:head>

<ResetPasswordForm {form} />
