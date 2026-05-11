<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	// Reflect customiser state (primary colour + sidebar size + content
	// width) on <html> on mount AND on every change. The effect re-runs
	// whenever any $state field on the theme store mutates.
	$effect(() => {
		// Touch each reactive field so the effect's dep graph picks them
		// up. Cheap reads; no runtime cost beyond the dep tracking.
		void theme.primary;
		void theme.sidebarSize;
		void theme.contentWidth;
		theme.applyToDocument();
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{@render children()}
