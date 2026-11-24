<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import PageHeader from '#lib/layouts/PageHeader.svelte';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';

	/** Tenant-context group error boundary: the way out is the tenants list. */
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
		homeHref={resolve('operator/tenants')}
		homeLabel={$_('errors.route.backToTenants')}
		signInHref={status === 401 ? resolve('signin') : undefined}
	/>
</div>
