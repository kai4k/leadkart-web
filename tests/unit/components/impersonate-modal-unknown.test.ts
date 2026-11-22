/**
 * I-5: the modal says "did not start" only after a read that answered. With no answer from any follow-up read it says
 * nothing is known and points at the banner.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import en from '../../../src/lib/i18n/locales/en.json';

vi.mock('$app/navigation', () => ({ beforeNavigate: vi.fn() }));
const store = vi.hoisted(() => ({ answer: 'unknown' as string, start: vi.fn() }));
vi.mock('#lib/features/operator/impersonation/stores/impersonation.svelte', async (orig) => ({
	...(await orig<Record<string, unknown>>()),
	impersonation: {
		checking: false,
		start: (...a: unknown[]) => store.start(...a),
		resolveUnknownStart: () => Promise.resolve(store.answer)
	}
}));

import { StartOutcomeUnknownError } from '#lib/features/operator/impersonation/stores/errors.ts';
import ImpersonateModal from '#lib/features/operator/impersonation/components/ImpersonateModal.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	store.start.mockRejectedValue(new StartOutcomeUnknownError());
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

async function submit() {
	component = mount(ImpersonateModal, {
		target,
		props: {
			open: true,
			tenant: { id: 't1', display_name: 'Acme' } as never,
			onOpenChange: vi.fn()
		}
	});
	flushSync();
	await new Promise((r) => setTimeout(r, 30));
	const reason = document.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!;
	reason.value = 'a reason that is long enough';
	reason.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	document.querySelector<HTMLFormElement>('#impersonate-form')!.requestSubmit();
	await new Promise((r) => setTimeout(r, 60));
	flushSync();
}

describe('the modal after a start whose outcome was unknown', () => {
	it('unknown: "We could not confirm whether the session started."', async () => {
		store.answer = 'unknown';
		await submit();
		expect(document.body.textContent).toContain(en.shell.impersonation.outcomeUnknown);
		expect(document.body.textContent).not.toContain(en.shell.impersonation.notStarted);
	});
	it('not-started (a read answered and did not list it): "The session did not start."', async () => {
		store.answer = 'not-started';
		await submit();
		expect(document.body.textContent).toContain(en.shell.impersonation.notStarted);
	});
});
