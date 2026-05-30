<script lang="ts">
	import { _ } from 'svelte-i18n';
	import SigninForm from '$features/auth/components/SigninForm.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>{$_('auth.signin.title')} · LeadKart</title>
</svelte:head>

<SigninForm {form} />
