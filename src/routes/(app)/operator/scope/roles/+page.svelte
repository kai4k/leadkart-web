<script lang="ts">
	import RolesList from '$features/roles/components/RolesList.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head><title>Roles · {data.tenant.display_name} · LeadKart</title></svelte:head>

<RolesList />
