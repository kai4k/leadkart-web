/**
 * A sign-in changes the person the browser holds: the other tabs of the app must reload instead of
 * collecting 409s (their forms and fingerprints belong to the person who signed out). The sign-in
 * form announces on the channel the context changes use, once the action ends in a redirect.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, tick, unmount } from 'svelte';

type Submit = () => (opts: {
	result: { type: string };
	update: () => Promise<void>;
}) => Promise<void> | void;
const captured = vi.hoisted(() => ({ submit: undefined as unknown }));
vi.mock('$app/forms', () => ({
	enhance: (_node: unknown, submit: unknown) => {
		captured.submit = submit;
		return { destroy() {} };
	},
	applyAction: async () => {},
	deserialize: () => ({})
}));
vi.mock('$app/state', () => ({ page: { url: new URL('http://x/signin'), data: {} } }));
vi.mock('$app/paths', () => ({ resolve: (p: string) => `/${p}` }));
const announce = vi.hoisted(() => vi.fn());
vi.mock('#lib/api/operator-scope.ts', () => ({ announceContextChange: announce }));

import SigninForm from '#lib/features/auth/components/SigninForm.svelte';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
beforeEach(() => {
	vi.clearAllMocks();
	target = document.body.appendChild(document.createElement('div'));
	component = mount(SigninForm, { target });
	flushSync();
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
});

const finish = async (type: string) => {
	const after = (captured.submit as Submit)();
	await after({ result: { type }, update: () => Promise.resolve() });
	await tick();
};

describe('SigninForm announces a sign-in', () => {
	it('after a successful sign-in (the action redirects)', async () => {
		await finish('redirect');
		expect(announce).toHaveBeenCalledTimes(1);
		expect(announce).toHaveBeenCalledWith('session');
	});

	it('not after a refused one', async () => {
		await finish('failure');
		expect(announce).not.toHaveBeenCalled();
	});
});
