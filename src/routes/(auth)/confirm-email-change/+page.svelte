<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ConfirmEmailChangeView from '$features/auth/components/ConfirmEmailChangeView.svelte';
</script>

<svelte:head>
	<title>{$_('auth.changeEmail.confirm.title')} · LeadKart</title>
</svelte:head>

<ConfirmEmailChangeView />
