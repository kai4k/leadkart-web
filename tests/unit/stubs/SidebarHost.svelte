<script lang="ts">
	/** The sidebar inside the controlled provider, exactly as AppShell mounts it. */
	import { Sidebar as Block } from '#lib/components/ui/index.ts';
	import Sidebar from '#lib/layouts/Sidebar.svelte';
	import { createSidebarSizing } from '#lib/layouts/sidebar-sizing.ts';
	import {
		createPreferences,
		noopStorage,
		setPreferences,
		type Preferences
	} from '#lib/features/preferences/index.ts';

	let { prefs, onNavigate }: { prefs: Partial<Preferences>; onNavigate?: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const store = createPreferences({ ...prefs } as Preferences, noopStorage, () => null);
	setPreferences(store);
	const sizing = createSidebarSizing(store);
</script>

<Block.Provider open={sizing.open} onOpenChange={sizing.setOpen}>
	<Sidebar {onNavigate} />
	<Block.Trigger />
</Block.Provider>
