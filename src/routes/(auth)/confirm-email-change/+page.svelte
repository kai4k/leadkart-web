<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import ConfirmEmailChangePanel from '$features/auth/components/ConfirmEmailChangePanel.svelte';

	const token = $derived(page.url.searchParams.get('token'));
</script>

<svelte:head>
	<title>{$_('auth.confirmEmail.title')} · LeadKart</title>
</svelte:head>

<ConfirmEmailChangePanel {token} />
