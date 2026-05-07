<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	// Apply the effective theme to <html> on mount AND on every change.
	// `$effect` re-runs when `theme.current` mutates (toggle from
	// Topbar, system-preference change, etc.) — keeps the DOM in sync.
	$effect(() => {
		// Read theme.effective so the effect's reactive dep graph picks it up.
		void theme.effective;
		theme.applyToDocument();
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{@render children()}
