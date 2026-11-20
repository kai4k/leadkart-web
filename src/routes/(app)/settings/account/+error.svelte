<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '$layouts/PageHeader.svelte';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';

	/** Account-settings group error boundary: keeps the user inside the AppShell. */
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<PageHeader title={$_(routeErrorTitleKey(status))} crumbs={[]} />
	<RouteError
		{status}
		message={page.error?.message}
		homeHref={resolve('dashboard')}
		homeLabel={$_('errors.route.backToDashboard')}
		signInHref={status === 401 ? resolve('signin') : undefined}
	/>
</div>
