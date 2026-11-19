import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

const state = vi.hoisted(() => ({ page: { status: 503, error: { message: 'Down' } } }));
const logout = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('$app/state', () => state);
vi.mock('$app/paths', () => ({ resolve: (p: string) => p }));
vi.mock('$features/auth', () => ({ session: { logout } }));

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
	document.cookie = 'lk_csrf=; Max-Age=0; path=/';
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.cookie = 'lk_csrf=; Max-Age=0; path=/';
});

describe('root error page sign-out', () => {
	it('offers a POST sign-out form to the existing logout endpoint on a 5xx with a session', async () => {
		document.cookie = 'lk_csrf=abc; path=/';
		await render();
		const form = target.querySelector<HTMLFormElement>('form[action="/auth/logout"]');
		expect(form).not.toBeNull();
		expect(form!.method).toBe('post');
		expect(form!.querySelector('button[type="submit"]')?.textContent).toMatch(/sign out/i);
	});

	it('submitting it ends the session through the CSRF-protected logout, not a plain navigation', async () => {
		document.cookie = 'lk_csrf=abc; path=/';
		await render();
		const form = target.querySelector<HTMLFormElement>('form[action="/auth/logout"]')!;
		const ev = new Event('submit', { cancelable: true, bubbles: true });
		form.dispatchEvent(ev);
		expect(ev.defaultPrevented).toBe(true);
		expect(logout).toHaveBeenCalledTimes(1);
	});

	it('shows nothing extra for a 4xx, or when there is no session', async () => {
		state.page.status = 404;
		document.cookie = 'lk_csrf=abc; path=/';
		await render();
		expect(target.querySelector('form')).toBeNull();
		unmount(component!);
		component = undefined;
		state.page.status = 503;
		document.cookie = 'lk_csrf=; Max-Age=0; path=/';
		await render();
		expect(target.querySelector('form')).toBeNull();
	});

	it('still renders only the fixed copy from the error', async () => {
		document.cookie = 'lk_csrf=abc; path=/';
		await render();
		expect(target.textContent).toContain('503');
		expect(target.textContent).toContain('Down');
	});
});
