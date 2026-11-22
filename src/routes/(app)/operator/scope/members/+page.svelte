<script lang="ts">
	import { plainTitle } from '#lib/utils/page-title.ts';
	import { UsersList } from '$features/users';
	import { rulesOfTenantPolicy } from '#lib/features/auth/password-policy.ts';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
</script>

<svelte:head><title>Members · {plainTitle(data.tenant.display_name)} · LeadKart</title></svelte:head
>

<!-- the password typed in Add user is for THIS company: its policy, not the operator's own -->
<UsersList passwordPolicy={rulesOfTenantPolicy(data.tenant.password_policy)} />
