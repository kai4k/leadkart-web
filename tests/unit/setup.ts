import '@testing-library/jest-dom/vitest';
import { addMessages, init } from 'svelte-i18n';
import en from '../../src/lib/i18n/locales/en.json';

// The app loads locales lazily (src/lib/i18n/index.ts); a unit test has no loader, so English is
// registered synchronously here and every code that reads user copy (`codeCopy`) finds it.
addMessages('en', en);
void init({ fallbackLocale: 'en', initialLocale: 'en' });

// jsdom has no ResizeObserver. bits-ui's Command viewport (the listbox of the command palette and the combobox list) observes
// its height, so a no-op stand-in keeps those components mountable under test; layout itself is the browser's job (e2e).
if (typeof globalThis.ResizeObserver === 'undefined') {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver;
}
