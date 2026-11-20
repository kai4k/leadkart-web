<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import RouteError, { routeErrorTitleKey } from '#lib/components/feedback/RouteError.svelte';

	const status = $derived(page.status);
</script>

<svelte:head>
	<title>{status} · Dev</title>
</svelte:head>

<main
	id="main-content"
	tabindex="-1"
	class="stack stack-relaxed container mx-auto py-12 outline-none"
>
	<h1 class="text-foreground text-xl font-semibold">{$_(routeErrorTitleKey(status))}</h1>
	<RouteError
		{status}
		message={page.error?.message}
		homeHref={resolve('dashboard')}
		homeLabel={$_('errors.route.backToDashboard')}
	/>
</main>
