/**
 * The sign-in card: the lockout countdown renders from `onResult` (the banner shows the seconds left and the submit
 * button is off for the wait), and the fields carry the autocomplete values password managers rely on.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';

type After = (o: {
	result: { type: string; data?: unknown };
	update: () => Promise<void>;
	formElement: HTMLFormElement;
}) => Promise<void>;
const captured = vi.hoisted(() => ({ submit: undefined as unknown }));
vi.mock('$app/forms', () => ({
	enhance: (_n: unknown, submit: unknown) => {
		captured.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/state', () => ({ page: { url: new URL('http://x/signin'), data: {} } }));
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
vi.mock('#lib/api/operator-scope.ts', () => ({ announceContextChange: vi.fn() }));

import SigninForm from '#lib/features/auth/components/SigninForm.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
let props: { form?: Record<string, unknown> };
beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
	target = document.body.appendChild(document.createElement('div'));
	props = reactiveProps<{ form?: Record<string, unknown> }>({});
	component = mount(SigninForm, { target, props: props as never });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	vi.useRealTimers();
});

const button = () => target.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const submitResult = async (type: string, data?: unknown) => {
	const form = target.querySelector('form')!;
	const after = await (
		captured.submit as (i: { formElement: HTMLFormElement; cancel: () => void }) => Promise<After>
	)({ formElement: form, cancel: vi.fn() });
	await (after as After)({
		result: { type, data },
		update: () => Promise.resolve(),
		formElement: form
	});
	flushSync();
	await tick();
};

describe('lockout countdown', () => {
	it('a 423 result disables the submit button, shows the seconds left, counts down, and re-enables', async () => {
		props.form = {
			values: { email: 'a@b.co' },
			fieldKeys: {},
			fieldMessages: {},
			formErrorKey: 'auth.errors.accountLocked',
			retryAfterSeconds: 3
		};
		flushSync();
		await submitResult('failure', { retryAfterSeconds: 3 });
		expect(button().disabled).toBe(true);
		expect(target.textContent).toContain('3 seconds');
		vi.advanceTimersByTime(1000);
		flushSync();
		expect(target.textContent).toContain('2 seconds');
		expect(button().disabled).toBe(true);
		vi.advanceTimersByTime(2000);
		flushSync();
		expect(button().disabled).toBe(false);
	});

	it('any other result ends a countdown at once', async () => {
		await submitResult('failure', { retryAfterSeconds: 30 });
		expect(button().disabled).toBe(true);
		await submitResult('failure', {});
		expect(button().disabled).toBe(false);
	});

	it('no lockout: the button is enabled', () => {
		expect(button().disabled).toBe(false);
	});
});

describe('the fields', () => {
	it('email is username, password is current-password', () => {
		expect(target.querySelector('input[name="email"]')!.getAttribute('autocomplete')).toBe(
			'username'
		);
		expect(target.querySelector('input[name="password"]')!.getAttribute('autocomplete')).toBe(
			'current-password'
		);
	});

	it('the sign-in form is not scoped (nothing signed in yet) and has no leave guard prompt text', () => {
		expect(target.querySelector('input[type="hidden"]')).toBeNull();
	});
});

describe('the password policy text states the server policy, not 12', () => {
	it.each([
		en.auth.resetPassword.newPasswordHint,
		en.account.security.changePassword.newPasswordHint
	])('%s', (hint) => {
		expect(hint).toContain('8 characters');
		expect(hint).not.toContain('12');
		for (const part of ['uppercase', 'lowercase', 'digit', 'symbol']) expect(hint).toContain(part);
	});
});
