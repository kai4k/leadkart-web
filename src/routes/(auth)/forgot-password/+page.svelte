<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { ForgotPasswordForm } from '#lib/features/auth/index.ts';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{$_('auth.forgotPassword.title')} · LeadKart</title>
</svelte:head>

<ForgotPasswordForm {form} />
