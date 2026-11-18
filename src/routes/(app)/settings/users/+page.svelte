<script lang="ts">
	import { UsersList } from '$features/users';
	import { Breadcrumbs, type BreadcrumbItem } from '$ui';

	const breadcrumbs: BreadcrumbItem[] = [{ label: 'Settings' }, { label: 'Team' }];
</script>

<svelte:head>
	<title>Team · LeadKart</title>
</svelte:head>

<div class="stack stack-relaxed">
	<Breadcrumbs items={breadcrumbs} />
	<UsersList />
</div>
