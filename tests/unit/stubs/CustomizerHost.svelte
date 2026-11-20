<script lang="ts">
	/** The customizer sheet on the preferences context exactly as AppShell mounts it (open). */
	import ThemeCustomizer from '$layouts/ThemeCustomizer.svelte';
	import { setPreferences, type PreferencesStore } from '$features/preferences';

	let { prefs, open = true }: { prefs: PreferencesStore; open?: boolean } = $props();
	// svelte-ignore state_referenced_locally
	setPreferences(prefs);
	// svelte-ignore state_referenced_locally
	let isOpen = $state(open);
</script>

<ThemeCustomizer bind:open={isOpen} onOpenChange={(o) => (isOpen = o)} />
