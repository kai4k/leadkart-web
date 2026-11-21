<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { UsersList } from '$features/users';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head><title>Members · {plainTitle(data.tenant.display_name)} · LeadKart</title></svelte:head
>

<UsersList />
