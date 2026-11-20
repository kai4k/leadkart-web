<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { Tooltip } from '$ui';
	import {
		createPreferences,
		DEFAULT_PREFERENCES,
		removeLegacyThemeKeys,
		setPreferences
	} from '$features/preferences';

	let { children, data } = $props();

	// Per request (context), never a module singleton: the server renders many requests in one process.
	// `data.preferences` is the decoded lk_ui cookie; the store keeps <html data-*> in step with it.
	// svelte-ignore state_referenced_locally
	setPreferences(createPreferences(data.preferences ?? DEFAULT_PREFERENCES));

	// Children mount before their parent, so this runs once the whole tree is
	// hydrated. E2E checks wait for it: SSR-rendered controls prove nothing.
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	// The old localStorage customiser keys are dead weight now that preferences live in the lk_ui cookie.
	onMount(removeLegacyThemeKeys);
</script>

<a href="#main-content" class="skip-link">Skip to main content</a>

<Tooltip.Provider delayDuration={200}>
	{@render children()}
</Tooltip.Provider>
