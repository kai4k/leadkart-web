/**
 * A password change ends every session of the person (Go revokes them all) and the action answers
 * with a redirect to sign-in: the other tabs must reload instead of collecting refusals. Both forms
 * that change a password announce on the channel the context changes use, once the action redirects;
 * removing `onResult={announceSessionChange}` from either fails here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

type Submit = (input: {
	formElement: HTMLFormElement;
}) => (opts: { result: { type: string }; update: () => Promise<void> }) => Promise<void> | void;
const captured = vi.hoisted(() => ({ submit: undefined as unknown }));
vi.mock('$app/forms', () => ({
	enhance: (_node: unknown, submit: unknown) => {
		captured.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/state', () => ({ page: { url: new URL('http://x/'), data: {} } }));
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
const announce = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/operator-scope.ts', () => ({ announceContextChange: announce }));

import ChangePasswordForm from '#lib/features/auth/components/ChangePasswordForm.svelte';
import MustChangePasswordPage from '../../../src/routes/(app)/must-change-password/+page.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	vi.clearAllMocks();
	captured.submit = undefined;
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

const finish = async (type: string) => {
	expect(captured.submit, 'the form is enhanced').toBeDefined();
	const after = (captured.submit as Submit)({ formElement: document.createElement('form') });
	await after({ result: { type }, update: () => Promise.resolve() });
	await tick();
};

describe.each([
	[
		'ChangePasswordForm (settings)',
		() => mount(ChangePasswordForm, { target, props: { form: undefined } })
	],
	[
		'the forced change page (must-change-password)',
		() => mount(MustChangePasswordPage, { target, props: { form: null } })
	]
])('%s announces a password change', (_name, render) => {
	beforeEach(() => {
		component = render();
		flushSync();
	});

	it('after the action redirects (the session ended)', async () => {
		await finish('redirect');
		expect(announce).toHaveBeenCalledTimes(1);
		expect(announce).toHaveBeenCalledWith('session');
	});

	it('not after a refused change (the session is still there)', async () => {
		await finish('failure');
		expect(announce).not.toHaveBeenCalled();
	});
});
