<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SigninForm from '$features/auth/components/SigninForm.svelte';
</script>

<svelte:head>
	<title>{$_('auth.signin.title')} · LeadKart</title>
</svelte:head>

<SigninForm />
