<script lang="ts">
	// Stands in for ManagerSelectorDrawer: records the roster it was handed.
	let { userList }: { userList: { membership_id: string; status: string }[] } = $props();
	$effect(() => {
		(globalThis as { __roster?: unknown }).__roster = userList.map((u) => u.membership_id);
	});
</script>
