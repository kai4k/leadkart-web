import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import ActivityTimeline from '#lib/features/audit/components/ActivityTimeline.svelte';
import type { ActivityDto, ActivityListResponse } from '#lib/features/audit/schemas.ts';
import { AuthError, NetworkError, NotFoundError } from '#lib/api/errors.ts';

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
	document.body.innerHTML = '';
});

const event = (over: Partial<ActivityDto> = {}): ActivityDto => ({
	id: 'e-1',
	event_type: 'identity.user.role_assigned',
	actor_id: 'p-1',
	occurred_at: '2026-11-20T10:00:00Z',
	succeeded: true,
	failure_reason: null,
	trace_id: null,
	payload: {},
	...over
});

type Query = {
	isPending: boolean;
	isError: boolean;
	error: unknown;
	data: ActivityListResponse | undefined;
	refetch?: () => unknown;
};
const loaded = (items: ActivityDto[], next_cursor: string | null = null): Query => ({
	isPending: false,
	isError: false,
	error: null,
	data: { items, next_cursor }
});
const failed = (error: unknown, refetch = vi.fn()): Query => ({
	isPending: false,
	isError: true,
	error,
	data: undefined,
	refetch
});

function render(query: Query, props: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	component = mount(ActivityTimeline as never, { target, props: { query, ...props } });
	flushSync();
}
const button = (name: string) =>
	[...target.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.textContent?.trim() === name
	);
const text = () => target.textContent?.replace(/\s+/g, ' ') ?? '';

describe('ActivityTimeline: loading, failure and empty come from the query', () => {
	it('pending: a status that says activity is loading', () => {
		render({ isPending: true, isError: false, error: null, data: undefined });
		expect(target.querySelector('[role="status"]')!.textContent).toContain('Loading activity');
	});

	it('a failure that may pass says so and offers Try again, which refetches', () => {
		const refetch = vi.fn();
		render(failed(new NetworkError(new Error('offline')), refetch));
		expect(text()).toContain("Couldn't load activity");
		button('Try again')!.click();
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it('a 403 is an answer: "No access", nothing to retry', () => {
		render(failed(new AuthError(403)));
		expect(text()).toContain('No access');
		expect(text()).not.toContain("Couldn't load");
		expect(button('Try again')).toBeUndefined();
	});

	it('a 404 is an answer: "Not found", nothing to retry', () => {
		render(failed(new NotFoundError('tenant')));
		expect(text()).toContain('Not found');
		expect(button('Try again')).toBeUndefined();
	});

	it('a failed background refetch that may pass keeps the loaded events on screen', () => {
		render({
			...loaded([event()]),
			isError: true,
			error: new NetworkError(new Error('offline')),
			refetch: vi.fn()
		});
		expect(text()).toContain("Couldn't refresh activity");
		expect(text()).toContain('identity.user.role assigned');
	});

	it('no events: the empty state, not a blank card', () => {
		render(loaded([]));
		expect(text()).toContain('No activity');
		expect(target.querySelector('[aria-label="Activity timeline"]')).toBeNull();
	});
});

describe('ActivityTimeline: the events', () => {
	it('an event reads as what happened; one nobody ran is the system’s', () => {
		render(loaded([event(), event({ id: 'e-2', event_type: 'outbox.dispatch', actor_id: null })]));
		expect(text()).toContain('identity.user.role assigned');
		expect(text()).toContain('System · outbox.dispatch');
		expect(text()).not.toContain('System · identity.user');
	});

	it('a command that did not go through says so, with Go’s reason', () => {
		render(
			loaded([
				event(),
				event({ id: 'e-2', succeeded: false, failure_reason: 'tenant_already_suspended' })
			])
		);
		expect(text().match(/Did not go through/g)).toHaveLength(1);
		expect(text()).toContain('tenant_already_suspended');
	});

	it('the reference and the payload are shown when there are any', () => {
		render(loaded([event({ trace_id: 'corr-1', payload: { role: 'admin' } })]));
		expect(text()).toContain('ref: corr-1');
		button('Show details')!.click();
		flushSync();
		expect(target.querySelector('pre')!.textContent).toContain('"role": "admin"');
		expect(button('Hide details')).toBeDefined();
	});
});

describe('ActivityTimeline: more pages', () => {
	it('Load more is offered when there is a next page and a handler, and hands over the cursor', () => {
		const onLoadMore = vi.fn();
		render(loaded([event()], 'cursor-2'), { onLoadMore });
		button('Load more')!.click();
		expect(onLoadMore).toHaveBeenCalledWith('cursor-2');
	});

	it('no Load more on the last page, or with nobody to load it', () => {
		render(loaded([event()], null), { onLoadMore: vi.fn() });
		expect(button('Load more')).toBeUndefined();
		unmount(component!);
		component = undefined;
		target.remove();
		render(loaded([event()], 'cursor-2'));
		expect(button('Load more')).toBeUndefined();
	});
});
