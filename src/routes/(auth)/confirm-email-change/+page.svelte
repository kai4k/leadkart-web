<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ConfirmEmailChangeView from '$features/auth/components/ConfirmEmailChangeView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{$_('auth.changeEmail.confirm.title')} · LeadKart</title>
</svelte:head>

<ConfirmEmailChangeView phase={data.phase} />
