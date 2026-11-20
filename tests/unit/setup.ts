import '@testing-library/jest-dom/vitest';
import { addMessages, init } from 'svelte-i18n';
import en from '../../src/lib/i18n/locales/en.json';

// The app loads locales lazily (src/lib/i18n/index.ts); a unit test has no loader, so English is
// registered synchronously here and every code that reads user copy (`codeCopy`) finds it.
addMessages('en', en);
void init({ fallbackLocale: 'en', initialLocale: 'en' });
