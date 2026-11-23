<script lang="ts">
	import { Alert } from '$ui';
	import { usersListTruncatedQuery } from '$features/users/queries';
	import type { UserStatusFilter } from '$features/users/api';

	/**
	 * Warning shown wherever the full members list feeds a view (team list, hierarchy, role
	 * member counts) and the page cap stopped the read. Same cache entry as `usersListQuery`.
	 */
	let { count, status = 'active' }: { count: number; status?: UserStatusFilter } = $props();

	const truncated = usersListTruncatedQuery(() => status);
</script>

{#if truncated.data}
	<Alert variant="warning">
		Showing the first {count} members. The team is larger than this list can load.
	</Alert>
{/if}
