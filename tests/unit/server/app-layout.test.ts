import { describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';

const loadCapabilities = vi.hoisted(() => vi.fn());
vi.mock('#lib/server/capabilities.ts', () => ({ loadCapabilities }));

import { load } from '../../../src/routes/(app)/+layout.server.ts';

const event = () =>
	({
		cookies: {
			get: (n: string) => (n === 'lk_access' ? 'tok' : undefined),
			set: vi.fn(),
			delete: vi.fn()
		},
		url: new URL('http://x/dashboard'),
		locals: {}
	}) as never;
const run = () => (load as unknown as (e: never) => Promise<unknown>)(event());

describe('(app) layout: sign-in only for a real auth failure', () => {
	it('no usable capabilities (401 after refresh) -> redirect to sign-in with next', async () => {
		loadCapabilities.mockResolvedValueOnce(null);
		await expect(run()).rejects.toMatchObject({
			status: 303,
			location: '/signin?next=%2Fdashboard'
		});
	});

	it('Go answered 2xx with a body the web cannot read -> 502, never a sign-in loop', async () => {
		loadCapabilities.mockImplementationOnce(() => error(502, 'The service answered unexpectedly'));
		await expect(run()).rejects.toMatchObject({ status: 502 });
	});

	it('usable capabilities pass through', async () => {
		loadCapabilities.mockResolvedValueOnce({ person_id: 'p' });
		await expect(run()).resolves.toEqual({ capabilities: { person_id: 'p' } });
	});
});
