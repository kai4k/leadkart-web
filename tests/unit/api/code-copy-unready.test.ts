/**
 * Before a locale is ready (an error thrown before i18n started) the copy is the short built-in
 * line: never the key, never Go's text. `code-copy.ts` imports no locale file (they load lazily).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('svelte-i18n', () => ({
	_: {
		subscribe(run: (f: (key: string) => string) => void) {
			run(() => {
				throw new Error('Cannot format a message without first setting the initial locale.');
			});
			return () => {};
		}
	}
}));

import { codeCopy, UNREADY_COPY } from '#lib/api/code-copy.ts';

describe('codeCopy without a locale', () => {
	it('answers the built-in line for a known code, and nothing for an unknown one', () => {
		expect(codeCopy('role_name_taken')).toBe(UNREADY_COPY);
		expect(codeCopy('some_new_code')).toBeUndefined();
	});
});
