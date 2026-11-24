<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';

	/** Tenant Settings error boundary (an error thrown by this directory's own +layout.server.ts renders in the parent page, `(app)/+error.svelte`). */
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
