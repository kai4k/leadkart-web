/**
 * WCAG 2.5.3 (label in name): in EVERY state of the impersonation banner each button's accessible name IS its visible
 * text. The real banner is rendered over the real store (only the gateway is faked), the name is computed the way a
 * browser does (`dom-accessibility-api`).
 */
import { flushSync, mount, unmount } from 'svelte';
import { computeAccessibleName } from 'dom-accessibility-api';
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
vi.mock('$app/state', () => ({ page: { data: { capabilities: { person_id: 'A' } } } }));

import {
	impersonation,
	MUTATION_DEADLINE_MS
} from '#lib/features/operator/impersonation/stores/impersonation.svelte.ts';
import ImpersonationBanner from '#lib/features/operator/impersonation/components/ImpersonationBanner.svelte';
import en from '../../../../../src/lib/i18n/locales/en.json';

const dto = {
	session_id: 'S1',
	operator_id: 'op',
	target_tenant_id: 't',
	tenant_display_name: 'Acme Pharma',
	reason: 'support',
	created_at: '2030-01-01T00:00:00Z',
	expires_at: '2099-01-01T00:00:00Z'
};
const START = { target_tenant_id: 't', reason: 'a reason that is long enough' } as never;
const settle = async () => {
	for (let i = 0; i < 10; i++) {
		flushSync();
		await vi.advanceTimersByTimeAsync(0);
	}
};

let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	vi.useFakeTimers();
	vi.resetAllMocks();
	window.localStorage.clear();
	impersonation.forget();
	api.listImpersonationSessions.mockResolvedValue({ sessions: [] });
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	impersonation.forget();
	document.body.innerHTML = '';
	vi.useRealTimers();
});

function mountBanner() {
	component = mount(ImpersonationBanner, { target: document.body });
}
/** The buttons of the banner: [visible text, accessible name]. */
const buttons = () =>
	[...document.querySelectorAll<HTMLButtonElement>('[role="region"] button')].map((b) => ({
		text: (b.textContent ?? '').replace(/\s+/g, ' ').trim(),
		name: computeAccessibleName(b).replace(/\s+/g, ' ').trim()
	}));
function everyNameIsItsText(expected: string[]) {
	const found = buttons();
	expect(found.map((b) => b.text)).toEqual(expected);
	for (const { text, name } of found) expect(name, `the button "${text}"`).toBe(text);
}

describe('the banner buttons: accessible name === visible text, in every state', () => {
	it('a shown session: "End impersonation"', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto] });
		mountBanner();
		await settle();
		everyNameIsItsText([en.shell.impersonation.end]);
	});

	it('a failed End: "Try ending again"', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto] });
		api.endImpersonation.mockRejectedValue(new Error('boom'));
		mountBanner();
		await settle();
		document.querySelector<HTMLButtonElement>('[role="region"] button')!.click();
		await settle();
		expect(impersonation.endError).toBeTruthy();
		everyNameIsItsText([en.shell.impersonation.endRetry]);
	});

	it('a shown session whose refresh failed: the Retry link and the End button', async () => {
		api.listImpersonationSessions.mockResolvedValue({ sessions: [dto] });
		mountBanner();
		await settle();
		api.listImpersonationSessions.mockRejectedValue(new Error('net'));
		await impersonation.reconcile();
		await settle();
		expect(impersonation.readError).toBeTruthy();
		everyNameIsItsText([en.shell.impersonation.retry, en.shell.impersonation.end]);
	});

	it('nothing shown and the status could not be read: "Retry"', async () => {
		api.listImpersonationSessions.mockRejectedValue(new Error('net'));
		mountBanner();
		await settle();
		expect(impersonation.unknown).toBe(true);
		everyNameIsItsText([en.shell.impersonation.retry]);
	});

	it('nothing shown and a start whose outcome is being checked: "Retry"', async () => {
		mountBanner();
		await settle();
		api.startImpersonation.mockReturnValue(new Promise(() => {}));
		const started = impersonation.start(START).catch(() => {});
		await vi.advanceTimersByTimeAsync(MUTATION_DEADLINE_MS + 1_000); // past the mutation deadline
		await started;
		await settle();
		expect(impersonation.checking).toBe(true);
		everyNameIsItsText([en.shell.impersonation.retry]);
	});
});
