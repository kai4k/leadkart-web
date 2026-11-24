<script lang="ts">
	import { TenantSecurityForm } from '#lib/features/tenant/index.ts';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<TenantSecurityForm tenant={data.tenant} form={form ?? undefined} />
