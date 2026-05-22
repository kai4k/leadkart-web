<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ResetPasswordForm from '$features/auth/components/ResetPasswordForm.svelte';
</script>

<svelte:head>
	<title>{$_('auth.resetPassword.title')} · LeadKart</title>
</svelte:head>

<ResetPasswordForm />
