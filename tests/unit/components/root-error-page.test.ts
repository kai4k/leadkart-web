import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

const state = vi.hoisted(() => ({
	page: { status: 503, error: { message: 'Down' }, data: { csrfToken: null as string | null } }
}));
const logout = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('$app/state', () => state);
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));
vi.mock('#lib/features/auth/index.ts', () => ({ session: { logout } }));

import ErrorPage from '../../../src/routes/+error.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

const render = async () => {
	component = mount(ErrorPage, { target });
	flushSync();
	await tick();
};

beforeEach(() => {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
	state.page.status = 503;
	state.page.data.csrfToken = null;
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

describe('root error page sign-out', () => {
	it('offers a POST sign-out form to the existing logout endpoint on a 5xx with a session', async () => {
		state.page.data.csrfToken = 'abc';
		await render();
		const form = target.querySelector<HTMLFormElement>('form[action="/auth/logout"]');
		expect(form).not.toBeNull();
		expect(form!.method).toBe('post');
		expect(form!.querySelector('button[type="submit"]')?.textContent).toMatch(/sign out/i);
	});

	it('carries the CSRF value as a hidden `csrf` field, so the native POST works without JavaScript', async () => {
		state.page.data.csrfToken = 'abc';
		await render();
		const field = target.querySelector<HTMLInputElement>(
			'form[action="/auth/logout"] input[type="hidden"][name="csrf"]'
		);
		expect(field?.value).toBe('abc');
	});

	it('submitting it ends the session through the CSRF-protected logout, not a plain navigation', async () => {
		state.page.data.csrfToken = 'abc';
		await render();
		const form = target.querySelector<HTMLFormElement>('form[action="/auth/logout"]')!;
		const ev = new Event('submit', { cancelable: true, bubbles: true });
		form.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(true);
		expect(logout).toHaveBeenCalledTimes(1);
	});

	it('shows nothing extra for a 4xx, or when there is no session', async () => {
		state.page.status = 404;
		state.page.data.csrfToken = 'abc';
		await render();
		expect(target.querySelector('form')).toBeNull();
		unmount(component!);
		component = undefined;
		state.page.status = 503;
		state.page.data.csrfToken = null;
		await render();
		expect(target.querySelector('form')).toBeNull();
	});

	it('still renders only the fixed copy from the error', async () => {
		state.page.data.csrfToken = 'abc';
		await render();
		expect(target.textContent).toContain('503');
		expect(target.textContent).toContain('Down');
	});
});
