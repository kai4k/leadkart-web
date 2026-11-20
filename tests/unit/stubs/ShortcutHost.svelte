<script lang="ts">
	/** The sidebar provider wired to the preferences exactly as AppShell does it. */
	import { Sidebar as Block } from '$ui';
	import { createSidebarSizing } from '$layouts/sidebar-sizing.ts';
	import type { PreferencesStore } from '$features/preferences';

	let { prefs, enabled = true }: { prefs: PreferencesStore; enabled?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	const sizing = createSidebarSizing(prefs);
</script>

<Block.Provider open={sizing.open} onOpenChange={sizing.setOpen} shortcutEnabled={enabled}>
	<input aria-label="field" />
</Block.Provider>
