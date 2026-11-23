/**
 * The email-change link is single-use. Opening the page must spend nothing (a mail link scanner or a prefetch opens it
 * too): the load only reads the token, and ONE click of the person confirms.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { load } from '../../../../src/routes/(auth)/confirm-email-change/+page.ts';
import ConfirmEmailChangeView from '#lib/features/auth/components/ConfirmEmailChangeView.svelte';
import en from '#lib/i18n/locales/en.json';

const copy = en.auth.changeEmail.confirm;

describe('confirm-email-change load', () => {
	const run = (query: string) => {
		const fetch = vi.fn();
		const data = (load as unknown as (e: object) => { token: string })({
			url: new URL(`http://x/confirm-email-change${query}`),
			fetch
		});
		return { data, fetch };
	};

	it('reads the token and sends nothing', () => {
		const { data, fetch } = run('?token=signed.email.token');
		expect(data).toEqual({ token: 'signed.email.token' });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('no token -> an empty one (the view says the link is incomplete)', () => {
		expect(run('').data).toEqual({ token: '' });
	});
});

describe('ConfirmEmailChangeView', () => {
	let component: ReturnType<typeof mount> | undefined;
	let fetchMock: ReturnType<typeof vi.fn>;
	const answer = (status: number | Error) =>
		status instanceof Error
			? Promise.reject(status)
			: Promise.resolve(new Response(status === 204 ? null : '{}', { status }));

	beforeEach(() => {
		fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => {
		if (component) unmount(component);
		component = undefined;
		document.body.innerHTML = '';
		vi.unstubAllGlobals();
	});

	const show = (token: string) => {
		component = mount(ConfirmEmailChangeView, { target: document.body, props: { token } });
		flushSync();
	};
	const button = (label: string) =>
		[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
	const text = () => document.body.textContent ?? '';

	it('opening the page posts nothing: it asks for one click', () => {
		show('t');
		expect(fetchMock).not.toHaveBeenCalled();
		expect(text()).toContain(copy.prompt);
		expect(button(copy.submit)).toBeDefined();
	});

	it('the click posts the token once and shows the success', async () => {
		fetchMock.mockReturnValue(answer(204));
		show('t');
		button(copy.submit)!.click();
		await vi.waitFor(() => expect(text()).toContain(copy.success));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0]![0]).toBe('/auth/confirm-email-change');
		expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ token: 't' });
	});

	it('no token: says so and offers nothing to click', () => {
		show('');
		expect(text()).toContain(copy.missingToken);
		expect(button(copy.submit)).toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([400, 404, 409])('Go refused the token (%i): invalid, no second try', async (status) => {
		fetchMock.mockReturnValue(answer(status));
		show('t');
		button(copy.submit)!.click();
		await vi.waitFor(() => expect(text()).toContain(copy.invalidToken));
		expect(button(copy.submit)).toBeUndefined();
		expect(button(copy.retry)).toBeUndefined();
	});

	it.each([
		[500, copy.unreachable],
		[502, copy.unreachable],
		[504, copy.unreachable],
		[new TypeError('failed'), copy.unreachable],
		[429, copy.rateLimited]
	])('%s: the token is still valid, the button asks again', async (status, line) => {
		fetchMock.mockReturnValueOnce(answer(status)).mockReturnValueOnce(answer(204));
		show('t');
		button(copy.submit)!.click();
		await vi.waitFor(() => expect(text()).toContain(line));
		button(copy.retry)!.click();
		await vi.waitFor(() => expect(text()).toContain(copy.success));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
