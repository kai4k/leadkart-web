import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet, flushSync, mount, unmount } from 'svelte';
import QueryState from '#lib/components/feedback/QueryState.svelte';
import { reactiveProps } from '../helpers/reactive-props.svelte.ts';
import { ApiError, AuthError, NetworkError, NotFoundError } from '#lib/api/errors.ts';

type Lead = { name: string };
interface FakeQuery {
	isPending: boolean;
	isError: boolean;
	error: unknown;
	data: Lead | undefined;
	refetch?: () => unknown;
}

const content = createRawSnippet<[Lead]>((lead) => ({
	render: () => `<p data-testid="content">Hello ${lead().name}</p>`
}));
const emptySnippet = createRawSnippet(() => ({
	render: () => '<p data-testid="custom-empty">Nothing</p>'
}));
const skeletonSnippet = createRawSnippet(() => ({
	render: () => '<p data-testid="custom-skeleton">...</p>'
}));

let target: HTMLElement;
let component: ReturnType<typeof mount> | undefined;

function render(query: FakeQuery, extra: Record<string, unknown> = {}) {
	target = document.body.appendChild(document.createElement('div'));
	const props = reactiveProps({ query, noun: 'lead', children: content, ...extra });
	component = mount(QueryState as never, { target, props });
	flushSync();
	return props;
}
afterEach(() => {
	if (component) unmount(component);
	component = undefined;
	target?.remove();
});

const base: FakeQuery = { isPending: false, isError: false, error: null, data: undefined };
const q = (over: Partial<FakeQuery>): FakeQuery => ({ ...base, ...over });
const text = () => target.textContent ?? '';

describe('QueryState', () => {
	it('shows the default skeleton while pending, announced as a status with visually hidden text', () => {
		render(q({ isPending: true }));
		const busy = target.querySelector('[aria-busy="true"]');
		expect(busy).not.toBeNull();
		// aria-label on a div with no role is ignored by screen readers: the region is a status
		// and the words are real (visually hidden) text.
		expect(busy?.getAttribute('role')).toBe('status');
		expect(busy?.hasAttribute('aria-label')).toBe(false);
		expect(busy?.querySelector('.sr-only')?.textContent).toBe('Loading lead');
		expect(target.querySelectorAll('[data-slot="skeleton"]').length).toBe(2);
		expect(target.querySelector('[data-testid="content"]')).toBeNull();
	});

	it('uses the caller skeleton inside the same busy region', () => {
		render(q({ isPending: true }), { skeleton: skeletonSnippet });
		expect(
			target.querySelector('[aria-busy="true"] [data-testid="custom-skeleton"]')
		).not.toBeNull();
		expect(target.querySelector('[data-slot="skeleton"]')).toBeNull();
	});

	it('renders the children snippet with the data', () => {
		render(q({ data: { name: 'Asha' } }));
		expect(target.querySelector('[data-testid="content"]')?.textContent).toBe('Hello Asha');
		expect(target.querySelector('[role="alert"]')).toBeNull();
	});

	it('says "not found" for a 404, with no retry', () => {
		const refetch = vi.fn();
		render(q({ isError: true, error: new NotFoundError('/v1/leads/1'), refetch }));
		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent).toContain('Not found');
		expect(alert?.textContent).toContain('This resource was deleted or moved.');
		expect(target.querySelector('button')).toBeNull();
	});

	it('uses the caller 404 copy', () => {
		render(q({ isError: true, error: new NotFoundError('/x') }), {
			notFound: 'This lead is gone.'
		});
		expect(text()).toContain('This lead is gone.');
	});

	it('says "No access" for a 403, with no retry', () => {
		render(q({ isError: true, error: new AuthError(403) }));
		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent).toContain('No access');
		expect(alert?.textContent).toContain("You don't have permission to view lead.");
		expect(target.querySelector('button')).toBeNull();
	});

	it('a network failure is a danger alert with a working Try again', () => {
		const refetch = vi.fn();
		render(q({ isError: true, error: new NetworkError(new TypeError('x')), refetch }));
		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent).toContain("Couldn't load lead");
		expect(alert?.textContent).toContain('Connection problem');
		const retry = [...target.querySelectorAll('button')].find((b) =>
			b.textContent?.includes('Try again')
		);
		expect(retry).toBeDefined();
		retry?.click();
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it('an unknown error gets the generic line, never its own text', () => {
		render(q({ isError: true, error: new Error('RAW boom'), refetch: vi.fn() }));
		expect(text()).toContain("Couldn't load lead");
		expect(text()).toContain('Something went wrong. Please try again.');
		expect(text()).not.toContain('RAW boom');
	});

	it('a failed REFETCH keeps showing the data, with an inline notice and a working Try again', () => {
		const refetch = vi.fn();
		render(
			q({
				isError: true,
				error: new NetworkError(new TypeError('x')),
				data: { name: 'Asha' },
				refetch
			})
		);
		expect(target.querySelector('[data-testid="content"]')?.textContent).toBe('Hello Asha');
		const alert = target.querySelector('[role="alert"]');
		expect(alert?.textContent).toContain("Couldn't refresh lead");
		[...target.querySelectorAll('button')]
			.find((b) => b.textContent?.includes('Try again'))
			?.click();
		expect(refetch).toHaveBeenCalledTimes(1);
	});

	it('an error with no data yet still replaces the content with the alert', () => {
		render(q({ isError: true, error: new NetworkError(new TypeError('x')), refetch: vi.fn() }));
		expect(target.querySelector('[data-testid="content"]')).toBeNull();
		expect(target.querySelector('[role="alert"]')?.textContent).toContain("Couldn't load lead");
	});

	it('shows no Try again when the query cannot refetch', () => {
		render(q({ isError: true, error: new ApiError(500) }));
		expect(target.querySelector('button')).toBeNull();
	});

	it('renders the empty snippet when isEmpty says so', () => {
		render(q({ data: { name: '' } }), {
			isEmpty: (d: Lead) => d.name === '',
			empty: emptySnippet
		});
		expect(target.querySelector('[data-testid="custom-empty"]')).not.toBeNull();
		expect(target.querySelector('[data-testid="content"]')).toBeNull();
	});

	it('the default empty state is a plain icon and caption', () => {
		render(q({ data: { name: '' } }), { isEmpty: () => true, noun: 'members' });
		expect(text()).toContain('No members yet');
		expect(target.querySelector('svg')).not.toBeNull();
	});

	it('follows the query as it changes (pending, then data)', () => {
		const props = render(q({ isPending: true }));
		expect(target.querySelector('[aria-busy="true"]')).not.toBeNull();
		props.query = q({ data: { name: 'Zed' } });
		flushSync();
		expect(target.querySelector('[data-testid="content"]')?.textContent).toBe('Hello Zed');
		expect(target.querySelector('[aria-busy="true"]')).toBeNull();
	});
});
