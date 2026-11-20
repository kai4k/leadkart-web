<script lang="ts">
	/** The sidebar inside the controlled provider, exactly as AppShell mounts it. */
	import { Sidebar as Block } from '$ui';
	import Sidebar from '$layouts/Sidebar.svelte';
	import {
		createPreferences,
		noopStorage,
		setPreferences,
		type Preferences
	} from '$features/preferences';

	let { prefs, onNavigate }: { prefs: Partial<Preferences>; onNavigate?: () => void } = $props();

	// svelte-ignore state_referenced_locally
	const store = createPreferences({ ...prefs } as Preferences, noopStorage, () => null);
	setPreferences(store);
</script>

<Block.Provider
	open={store.sidebar !== 'small'}
	onOpenChange={(o) => store.set({ sidebar: o ? 'large' : 'small' })}
>
	<Sidebar {onNavigate} />
	<Block.Trigger />
</Block.Provider>
