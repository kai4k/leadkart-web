<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';

	// The auth frame supplies <main>; the page owns the <h1>.
	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<h1 class="text-foreground text-center text-xl font-semibold">
		{$_(routeErrorTitleKey(status))}
	</h1>
	<RouteError
		{status}
		message={page.error?.message}
		homeHref={resolve('signin')}
		homeLabel={$_('errors.route.backToSignIn')}
	/>
</div>
