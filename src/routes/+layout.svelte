<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { Tooltip } from '$ui';
	import { theme } from '#lib/hooks/use-theme.svelte.ts';

	let { children } = $props();

	// Children mount before their parent, so this runs once the whole tree is
	// hydrated. E2E checks wait for it: SSR-rendered controls prove nothing.
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	// Reflect customiser state on <html> on mount AND on every change.
	// The effect re-runs whenever any $state field on the theme store
	// mutates — touch each so the dep graph picks them up.
	$effect(() => {
		void theme.primary;
		void theme.sidebarCollapsed;
		void theme.contentWidth;
		theme.applyToDocument();
	});
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<Tooltip.Provider delayDuration={200}>
	{@render children()}
</Tooltip.Provider>
