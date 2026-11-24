<script lang="ts">
	import { page } from '$app/state';
	import { PermissionRequestDetail } from '#lib/features/permission-requests/index.ts';

	const id = $derived(page.params.id ?? '');
</script>

<svelte:head><title>Request · LeadKart</title></svelte:head>

<PermissionRequestDetail {id} />
