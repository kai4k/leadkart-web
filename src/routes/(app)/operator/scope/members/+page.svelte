<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { UsersList } from '$features/users';
	import { createListSearch } from '#lib/hooks/index.ts';
	import { rulesOfTenantPolicy } from '#lib/features/auth/password-policy.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	// the search text stays out of the URL; Back brings it back
	const search = createListSearch();
	export const snapshot = search.snapshot;
</script>

<svelte:head><title>Members · {plainTitle(data.tenant.display_name)} · LeadKart</title></svelte:head
>

<!-- the password typed in Add user is for THIS company: its policy, not the operator's own -->
<UsersList {search} passwordPolicy={rulesOfTenantPolicy(data.tenant.password_policy)} />
