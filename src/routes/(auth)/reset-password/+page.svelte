<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import ResetPasswordForm from '$features/auth/components/ResetPasswordForm.svelte';

	const token = $derived(page.url.searchParams.get('token'));
</script>

<svelte:head>
	<title>{$_('auth.reset.title')} · LeadKart</title>
</svelte:head>

<ResetPasswordForm {token} />
