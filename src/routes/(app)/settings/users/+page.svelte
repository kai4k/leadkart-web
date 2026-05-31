<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import UsersList from '$features/users/components/UsersList.svelte';
	import { myCapabilitiesQuery, hasCapability } from '$features/auth/queries';
	import { Breadcrumbs } from '$ui';
	import type { BreadcrumbItem } from '$ui';

	const capsQuery = myCapabilitiesQuery();
	$effect(() => {
		if (capsQuery.data && !hasCapability(capsQuery.data, 'identity.users.view')) {
			goto(resolve('/dashboard'), { replaceState: true });
		}
	});

	const breadcrumbs: BreadcrumbItem[] = [
		{ href: '/settings', label: 'Settings' },
		{ label: 'Team' }
	];
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<UsersList />
</div>
