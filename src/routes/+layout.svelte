<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { _, locale } from 'svelte-i18n';
	import { Toaster, Tooltip } from '$ui';
	import {
		createPreferences,
		DEFAULT_PREFERENCES,
		removeLegacyThemeKeys,
		setPreferences
	} from '$features/preferences';

	let { children, data } = $props();

	// The server renders in the language of THIS request. svelte-i18n's locale is one global store,
	// but Svelte renders the whole tree in a single synchronous pass (both dictionaries are already
	// loaded, so `set` is synchronous too): no other request can change it mid-render. It must stay
	// the first statement that touches i18n. In the browser the client hook has already started
	// from <html lang>.
	if (!browser) locale.set(data.locale);

	// Per request (context), never a module singleton: the server renders many requests in one process.
	// `data.preferences` is the decoded lk_ui cookie; the store keeps <html data-*> in step with it.
	// svelte-ignore state_referenced_locally
	const preferences = createPreferences(data.preferences ?? DEFAULT_PREFERENCES);
	setPreferences(preferences);
	// `auto` follows the OS (sonner's `system`); `black-white` is the light palette under the filter.
	const toastTheme = $derived(
		preferences.mode === 'dark' ? 'dark' : preferences.mode === 'auto' ? 'system' : 'light'
	);

	// Children mount before their parent, so this runs once the whole tree is
	// hydrated. E2E checks wait for it: SSR-rendered controls prove nothing.
	onMount(() => {
		document.documentElement.dataset.hydrated = 'true';
	});

	// The old localStorage customiser keys are dead weight now that preferences live in the lk_ui cookie.
	onMount(removeLegacyThemeKeys);
</script>

<a href="#main-content" class="skip-link">{$_('common.skipToContent')}</a>

<Tooltip.Provider delayDuration={200}>
	{@render children()}
</Tooltip.Provider>
<Toaster theme={toastTheme} />
