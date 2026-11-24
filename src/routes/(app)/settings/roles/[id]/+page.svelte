<script lang="ts">
	import { RoleDetail } from '#lib/features/roles/index.ts';

	let { data } = $props();
</script>

<RoleDetail roleId={data.roleId} />
