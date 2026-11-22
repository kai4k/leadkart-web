/**
 * The banner and the REAL store together, with a counting gateway: mounting with a persisted session key makes exactly
 * ONE read, and a settle does not trigger another (the mount effect used to read the store's status, so every settle
 * re-ran it: 42 reads after 20 flushes, back to back for as long as the operator was impersonating).
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
	startImpersonation: vi.fn(),
	endImpersonation: vi.fn(),
	listImpersonationSessions: vi.fn()
}));
vi.mock('#lib/features/operator/impersonation/api.ts', () => api);
vi.mock('#lib/features/operator/impersonation/api', () => api);
vi.mock('$features/auth', () => ({
	P: { platformImpersonationManage: 'platform.impersonation.manage' },
	session: { capabilities: { tier: 'operator' }, can: () => true }
}));
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'P1' } } } }));

import ImpersonationBanner from '#lib/features/operator/impersonation/components/ImpersonationBanner.svelte';
import { impersonation } from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';

let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	vi.resetAllMocks();
	window.localStorage.clear();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	document.body.innerHTML = '';
});

describe('the banner does not poll the sessions endpoint', () => {
	it('mounting reads once, and 20 settles later still once', async () => {
		api.listImpersonationSessions.mockResolvedValue({
			sessions: [
				{
					session_id: 'A',
					operator_id: 'o',
					target_tenant_id: 't',
					tenant_display_name: 'Company A',
					reason: 'support',
					created_at: '2030-01-01T00:00:00Z',
					expires_at: '2030-01-01T01:00:00Z'
				}
			]
		});
		component = mount(ImpersonationBanner, { target: document.body });
		for (let i = 0; i < 20; i++) {
			flushSync();
			await new Promise((r) => setTimeout(r, 0));
		}
		expect(api.listImpersonationSessions).toHaveBeenCalledTimes(1);
		expect(impersonation.active?.session_id).toBe('A');
		expect(document.querySelector('[role="region"]')).not.toBeNull();
	});
});
