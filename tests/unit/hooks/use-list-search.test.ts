import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageState = vi.hoisted(() => ({
	page: {
		url: new URL('http://localhost/'),
		route: { id: '/a' },
		data: {} as Record<string, unknown>
	}
}));
vi.mock('$app/state', () => pageState);

import { createListSearch } from '#lib/hooks/use-list-search.svelte.ts';

function signInAs(personId: string | null, route = '/a') {
	pageState.page.route = { id: route };
	pageState.page.data = personId ? { capabilities: { person_id: personId } } : {};
}

describe('createListSearch', () => {
	beforeEach(() => signInAs('p1'));

	it('starts empty and holds what is set', () => {
		const s = createListSearch();
		expect(s.value).toBe('');
		s.value = 'asha';
		expect(s.value).toBe('asha');
	});

	it('Back restores the text for the same person on the same list', () => {
		const a = createListSearch();
		a.value = 'tenant-3';
		const saved = a.snapshot.capture();
		const b = createListSearch();
		b.snapshot.restore(saved);
		expect(b.value).toBe('tenant-3');
	});

	it('the text is never written into what history keeps: only an opaque key', () => {
		const a = createListSearch();
		a.value = 'alice.secret';
		const saved = a.snapshot.capture();
		expect(JSON.stringify(saved)).not.toContain('alice.secret');
		expect(JSON.stringify(saved)).not.toContain('p1');
	});

	it('another person on the same tab (no reload) gets an empty box', () => {
		const a = createListSearch();
		a.value = 'alice.secret';
		const saved = a.snapshot.capture();
		signInAs('p2');
		const b = createListSearch();
		b.snapshot.restore(saved);
		expect(b.value).toBe('');
		// and the first person's text is gone for good, even if they come back
		signInAs('p1');
		const c = createListSearch();
		c.snapshot.restore(saved);
		expect(c.value).toBe('');
	});

	it('signed out: nothing is kept', () => {
		signInAs(null);
		const a = createListSearch();
		a.value = 'x';
		const b = createListSearch();
		b.snapshot.restore(a.snapshot.capture());
		expect(b.value).toBe('');
	});

	it('another list never reads this list text', () => {
		const a = createListSearch();
		a.value = 'asha';
		const saved = a.snapshot.capture();
		signInAs('p1', '/b');
		const b = createListSearch();
		b.snapshot.restore(saved);
		expect(b.value).toBe('');
	});

	it('history that holds no key (or an unknown one) restores an empty box, never a crash', () => {
		const s = createListSearch();
		s.value = 'x';
		s.snapshot.restore(undefined as unknown as string);
		expect(s.value).toBe('');
		s.value = 'x';
		s.snapshot.restore('not-a-key');
		expect(s.value).toBe('');
	});
});
