<script lang="ts">
	import { _ } from 'svelte-i18n';
	import TenantRegisterForm from '$features/tenant/components/TenantRegisterForm.svelte';
</script>

<svelte:head>
	<title>{$_('auth.register.title')} · LeadKart</title>
</svelte:head>

<TenantRegisterForm />
