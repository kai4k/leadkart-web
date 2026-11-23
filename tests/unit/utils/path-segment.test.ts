/**
 * An id from the page URL is ONE segment of the API path. `/leads/..%2F..%2Fusers` gives `params.id = "../../users"`;
 * written into the path as it is, the browser resolves the dots and the GET lands on `/api/v1/users`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seg } from '#lib/utils/path-segment.ts';
import { getUser } from '#lib/features/users/api.ts';
import { getRole } from '#lib/features/roles/api.ts';

afterEach(() => vi.unstubAllGlobals());

describe('seg', () => {
	it('keeps a crafted id inside its segment', () => {
		expect(seg('../../users')).toBe('..%2F..%2Fusers');
		expect(seg('a/b')).toBe('a%2Fb');
		expect(seg('a?x=1#y')).toBe('a%3Fx%3D1%23y');
		expect(seg('a b')).toBe('a%20b');
	});

	it('leaves a real id as it is', () => {
		const id = '00000000-0000-4000-8000-00000000010c';
		expect(seg(id)).toBe(id);
		expect(seg('m1')).toBe('m1');
	});

	it('refuses the two values no encoding protects', () => {
		expect(() => seg('.')).toThrow(TypeError);
		expect(() => seg('..')).toThrow(TypeError);
	});
});

describe('a gateway called with a crafted id', () => {
	const asked = async (call: () => Promise<unknown>): Promise<string> => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
		vi.stubGlobal('fetch', fetchMock);
		await call().catch(() => undefined);
		// what the browser would request: the URL parser resolves dot segments, an encoded slash is not one
		return new URL(String(fetchMock.mock.calls[0]![0]), 'http://app.test').pathname;
	};

	it('getUser("../../users") stays under /v1/users/ (it used to resolve to another path)', async () => {
		expect(await asked(() => getUser('../../users'))).toBe('/api/v1/users/..%2F..%2Fusers');
	});

	it('getRole("../users") stays under /v1/roles/', async () => {
		expect(await asked(() => getRole('../users'))).toBe('/api/v1/roles/..%2Fusers');
	});
});
