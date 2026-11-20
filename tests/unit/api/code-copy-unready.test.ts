/**
 * Before a locale is ready (an error thrown before i18n started) there is NO copy for a code: never
 * the key, never Go's text, and not a generic line either (that would hide the caller's own
 * built-in line for the code, which says what happened). `code-copy.ts` imports no locale file.
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

import { codeCopy } from '#lib/api/code-copy.ts';
import { ScopeChangedError, ScopeInvalidError } from '#lib/api/errors.ts';
import { SCOPE_CHANGED_MESSAGE, SCOPE_EXPIRED_MESSAGE } from '#lib/api/scope-header.ts';

describe('codeCopy without a locale', () => {
	it('answers nothing, for a known code and for an unknown one', () => {
		expect(codeCopy('role_name_taken')).toBeUndefined();
		expect(codeCopy('some_new_code')).toBeUndefined();
	});

	it('so the scope errors say their own built-in line, not a generic one', () => {
		expect(new ScopeChangedError().message).toBe(SCOPE_CHANGED_MESSAGE);
		expect(new ScopeInvalidError().message).toBe(SCOPE_EXPIRED_MESSAGE);
	});
});
