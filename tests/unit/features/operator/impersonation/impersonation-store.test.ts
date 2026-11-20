/**
 * The impersonation store: the company name shown in the banner belongs to ONE session id. A name
 * typed for session A must never label session B (another tab ended A and started B), and it must
 * go the moment its session ends or disappears.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);

import { impersonation } from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import { IMPERSONATION_SESSION_KEY } from '#lib/utils/impersonation-session-key.ts';

function dto(id: string) {
	return {
		session_id: id,
		reason: 'support',
		expires_at: '2030-01-01T00:00:00Z'
	};
}

beforeEach(async () => {
	vi.clearAllMocks();
	window.localStorage.clear();
	// the singleton keeps state between tests: bring it to idle through the public surface
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
	await impersonation.reconcile();
});

describe('impersonation target name', () => {
	it('is shown while the session it was typed for is active', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');
		expect(impersonation.active?.session_id).toBe('A');
		expect(impersonation.targetName).toBe('Alpha');
	});

	it('is dropped when another tab replaced the session (A ended, B started)', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');

		window.localStorage.setItem(IMPERSONATION_SESSION_KEY, 'B');
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('B')] });
		await impersonation.reconcile();

		expect(impersonation.active?.session_id).toBe('B');
		expect(impersonation.targetName).toBeNull();
	});

	it('is dropped when the session disappeared from the server', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');

		api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
		await impersonation.reconcile();

		expect(impersonation.active).toBeNull();
		expect(impersonation.targetName).toBeNull();
	});

	it('is dropped when the stored id was removed (another tab ended it)', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');

		window.localStorage.removeItem(IMPERSONATION_SESSION_KEY);
		await impersonation.reconcile();

		expect(impersonation.active).toBeNull();
		expect(impersonation.targetName).toBeNull();
	});

	it('is dropped by end(), and does not come back for a later session without a name', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');
		api.endImpersonation.mockResolvedValue(undefined);
		await impersonation.end();
		expect(impersonation.targetName).toBeNull();

		api.startImpersonation.mockResolvedValue({ session_id: 'C' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('C')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never);
		expect(impersonation.active?.session_id).toBe('C');
		expect(impersonation.targetName).toBeNull();
	});

	it('survives a reconcile that finds the same session', async () => {
		api.startImpersonation.mockResolvedValue({ session_id: 'A' });
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto('A')] });
		await impersonation.start({ tenant_id: 't', reason: 'support' } as never, 'Alpha');
		await impersonation.reconcile();
		expect(impersonation.targetName).toBe('Alpha');
	});
});
