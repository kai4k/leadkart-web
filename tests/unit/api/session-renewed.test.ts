/**
 * The real API client against a fake BFF: when the BFF renewed the session while answering a call
 * (a stale token after a role change), the client has the page re-read its capabilities at once.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const nav = vi.hoisted(() => ({ invalidate: vi.fn(() => Promise.resolve()), goto: vi.fn() }));
vi.mock('$app/navigation', () => nav);

import { api } from '#lib/api/client.ts';

const fetchMock = vi.fn();
beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('fetch', fetchMock);
});

const reply = (headers: Record<string, string> = {}, status = 200) =>
	Promise.resolve(
		new Response(JSON.stringify({}), {
			status,
			headers: { 'content-type': 'application/json', ...headers }
		})
	);

describe('session renewed by the BFF', () => {
	it('re-reads the capabilities (the app:capabilities layout dependency) after a renewed call', async () => {
		fetchMock.mockImplementation(() => reply({ 'x-lk-session-renewed': '1' }));
		await api.get('/v1/users', z.unknown());
		expect(nav.invalidate).toHaveBeenCalledWith('app:capabilities');
	});

	it('also after a renewed mutation', async () => {
		fetchMock.mockImplementation(() => reply({ 'x-lk-session-renewed': '1' }));
		await api.post('/v1/roles', {});
		expect(nav.invalidate).toHaveBeenCalledWith('app:capabilities');
	});

	it('not for an ordinary call', async () => {
		fetchMock.mockImplementation(() => reply());
		await api.get('/v1/users', z.unknown());
		expect(nav.invalidate).not.toHaveBeenCalled();
	});
});
