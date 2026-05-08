<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ForgotPasswordForm from '$features/auth/components/ForgotPasswordForm.svelte';
</script>

<svelte:head>
	<title>{$_('auth.forgot.title')} · LeadKart</title>
</svelte:head>

<ForgotPasswordForm />
