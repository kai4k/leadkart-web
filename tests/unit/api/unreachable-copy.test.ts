import { describe, expect, it } from 'vitest';
import { UNREACHABLE_COPY } from '#lib/api/errors.ts';
import en from '#lib/i18n/locales/en.json';

describe('one wording for "the BFF cannot reach Go"', () => {
	it('the i18n string the server actions use is the client error copy', () => {
		expect(en.auth.errors.upstreamUnavailable).toBe(UNREACHABLE_COPY);
		expect(UNREACHABLE_COPY).toBe(
			'The service is not reachable right now. Please try again in a moment.'
		);
	});
});
