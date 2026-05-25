<script lang="ts">
	import { page } from '$app/state';
	import PermissionRequestDetail from '$features/permission-requests/components/PermissionRequestDetail.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Request · LeadKart</title></svelte:head>

<PermissionRequestDetail {id} />
