import type { HandleClientError } from '@sveltejs/kit/hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/i18n/index.ts', () => ({ initI18n: () => {} }));

const { handleError } = await import('../../../src/hooks.client');

type HandleErrorInput = Parameters<HandleClientError>[0];

const event = { url: new URL('http://x/leads/1') } as unknown as HandleErrorInput['event'];

describe('handleError (Kit 3 kind-based)', () => {
	beforeEach(() => {
		// Framework and unknown branches log; keep test output pristine.
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('keeps app errors (error(404, "Person not found")) on Kit defaults', () => {
		const out = handleError({
			kind: 'app',
			error: { status: 404, message: 'Person not found' },
			event
		});
		expect(out).toBeUndefined();
		expect(console.error).not.toHaveBeenCalled();
	});

	it('maps a framework 404 (route miss) to generic copy', () => {
		const out = handleError({
			kind: 'framework',
			error: { status: 404, message: 'Not Found' },
			event
		});
		expect(out).toEqual({ message: 'Page not found' });
		expect(console.error).toHaveBeenCalledOnce();
	});

	it('keeps a framework non-404 4xx message', () => {
		const out = handleError({
			kind: 'framework',
			error: { status: 405, message: 'Method Not Allowed' },
			event
		});
		expect(out).toEqual({ message: 'Method Not Allowed' });
		expect(console.error).toHaveBeenCalledOnce();
	});

	it('maps a framework 500 to generic 5xx copy', () => {
		const out = handleError({
			kind: 'framework',
			error: { status: 500, message: 'Internal Error' },
			event
		});
		expect(out).toEqual({ message: 'Something went wrong on our end. Please try again.' });
		expect(console.error).toHaveBeenCalledOnce();
	});

	it('hides unknown error detail behind 5xx copy', () => {
		const out = handleError({ kind: 'unknown', error: new Error('db down'), event });
		expect(out).toEqual({ message: 'Something went wrong on our end. Please try again.' });
		expect(console.error).toHaveBeenCalledOnce();
	});
});
