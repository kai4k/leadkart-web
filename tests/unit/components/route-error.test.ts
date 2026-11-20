/**
 * RouteError: the one body of every error page: a Card with a status-aware destructive Alert and
 * link-buttons (an `<a>` styled as a button, never a `<button>` inside an `<a>`). It renders no
 * heading of its own beyond the page's single `<h1>`.
 */
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import RouteError from '#lib/components/feedback/RouteError.svelte';
import en from '../../../src/lib/i18n/locales/en.json';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
const render = (props: Record<string, unknown>) => {
	component = mount(RouteError, { target, props: props as never });
	flushSync();
};

beforeEach(() => {
	target = document.body.appendChild(document.createElement('div'));
});
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target.remove();
	document.body.innerHTML = '';
});

const base = { homeHref: '/dashboard', homeLabel: 'Back to dashboard' };

describe('RouteError', () => {
	it('404 says the page was not found', () => {
		render({ status: 404, ...base });
		expect(document.body.textContent).toContain(en.errors.route.notFound);
		expect(document.body.textContent).toContain('404');
	});

	it('403 says access is not allowed', () => {
		render({ status: 403, ...base });
		expect(document.body.textContent).toContain(en.errors.route.forbidden);
	});

	it('anything else is the generic copy, and a given message is shown', () => {
		render({ status: 502, message: 'Go is down', ...base });
		expect(document.body.textContent).toContain(en.errors.route.generic);
		expect(document.body.textContent).toContain('Go is down');
	});

	it('the home action is a link with button styling, with no button inside it', () => {
		render({ status: 404, ...base });
		const home = [...document.querySelectorAll('a')].find((a) =>
			a.textContent?.includes(base.homeLabel)
		)!;
		expect(home.getAttribute('href')).toBe('/dashboard');
		expect(home.querySelector('button')).toBeNull();
		expect(home.className).toMatch(/inline-flex/);
		expect(home.closest('button')).toBeNull();
	});

	it('offers sign in as a second link when asked to', () => {
		render({ status: 401, signInHref: '/signin', ...base });
		expect(document.querySelector('a[href="/signin"]')).not.toBeNull();
	});

	it('has a destructive alert region and no heading of its own', () => {
		render({ status: 500, ...base });
		expect(document.querySelector('[role="alert"]')).not.toBeNull();
		expect(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).toHaveLength(0);
	});
});
