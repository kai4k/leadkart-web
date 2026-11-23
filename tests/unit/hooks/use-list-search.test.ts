import { describe, expect, it } from 'vitest';
import { createListSearch } from '#lib/hooks/use-list-search.svelte.ts';

describe('createListSearch', () => {
	it('starts empty and holds what is set', () => {
		const s = createListSearch();
		expect(s.value).toBe('');
		s.value = 'asha';
		expect(s.value).toBe('asha');
	});

	it('the snapshot captures the text and Back restores it', () => {
		const a = createListSearch();
		a.value = 'tenant-3';
		const saved = a.snapshot.capture();
		const b = createListSearch();
		b.snapshot.restore(saved);
		expect(b.value).toBe('tenant-3');
	});

	it('history that holds no text restores an empty box, never a crash', () => {
		const s = createListSearch();
		s.value = 'x';
		s.snapshot.restore(undefined as unknown as string);
		expect(s.value).toBe('');
	});
});
