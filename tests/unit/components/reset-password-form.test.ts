/**
 * The reset card when the link is spent (expired, used, unknown, or refused too often: Go answers them
 * all `reset_token_invalid`): the form gives way to one sentence and the way to a new link, which
 * takes the focus. Any other failure keeps the form and its fields.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

vi.mock('$app/forms', () => ({
	enhance: () => ({ destroy() {} }),
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/state', () => ({
	page: { url: new URL('http://x/reset-password?token=t'), data: {} }
}));
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
vi.mock('$app/navigation', () => ({ goto: vi.fn(), beforeNavigate: vi.fn() }));

import ResetPasswordForm from '#lib/features/auth/components/ResetPasswordForm.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

const render = async (form?: Record<string, unknown>) => {
	component = mount(ResetPasswordForm, { target, props: { form } as never });
	flushSync();
	await tick();
	flushSync();
};
const failure = (parts: Record<string, unknown>) => ({
	values: {},
	fieldKeys: {},
	fieldMessages: {},
	formErrorKey: null,
	...parts
});
const newLink = () =>
	[...target.querySelectorAll('a')].find(
		(a) => a.textContent?.trim() === en.auth.resetPassword.requestNew
	);

describe('a link that can no longer be used', () => {
	it('says so once, offers a new link (focused), and shows no password fields', async () => {
		await render(failure({ formErrorKey: 'auth.resetPassword.errors.invalidToken' }));
		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent?.trim()).toBe('This link can no longer be used. Request a new one.');
		expect(target.querySelectorAll('[role="alert"]')).toHaveLength(1);
		expect(newLink()?.getAttribute('href')).toBe('/forgot-password');
		expect(document.activeElement).toBe(newLink());
		expect(target.querySelector('form')).toBeNull();
		expect(target.querySelector('input')).toBeNull();
	});
});

describe('any other answer keeps the form', () => {
	it.each([
		[
			'a refused password',
			failure({ fieldKeys: { new_password: 'auth.resetPassword.errors.breached' } })
		],
		['an outage', failure({ formErrorKey: 'auth.errors.upstreamUnavailable' })],
		['no answer yet', undefined]
	])('%s', async (_label, form) => {
		await render(form);
		expect(target.querySelector('form')).not.toBeNull();
		expect(target.querySelectorAll('input[type="password"]')).toHaveLength(2);
		expect(newLink()).toBeUndefined();
	});
});
