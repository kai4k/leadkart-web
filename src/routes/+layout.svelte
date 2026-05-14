<script lang="ts">
	import '../app.css';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	// Reflect customiser state on <html> on mount AND on every change.
	// The effect re-runs whenever any $state field on the theme store
	// mutates — touch each so the dep graph picks them up.
	$effect(() => {
		void theme.primary;
		void theme.sidebarColor;
		void theme.layoutDir;
		void theme.sidebarCollapsed;
		void theme.layoutMode;
		void theme.contentWidth;
		theme.applyToDocument();
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

{@render children()}
