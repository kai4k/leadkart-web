import { describe, expect, it } from 'vitest';
import { createDialogState } from '#lib/hooks/use-dialog-state.svelte.ts';

describe('createDialogState', () => {
	it('starts closed with no target', () => {
		const s = createDialogState<{ id: string }>();
		expect(s.open).toBe(false);
		expect(s.target).toBeNull();
	});

	it('show(x) opens it on x', () => {
		const s = createDialogState<{ id: string }>();
		s.show({ id: 'a' });
		expect(s.open).toBe(true);
		expect(s.target).toEqual({ id: 'a' });
	});

	it('show() with no target opens a dialog that has none (a create form)', () => {
		const s = createDialogState();
		s.show();
		expect(s.open).toBe(true);
		expect(s.target).toBeNull();
	});

	it('onOpenChange(false) clears both; onOpenChange(true) leaves the target as it is', () => {
		const s = createDialogState<string>();
		s.show('x');
		s.onOpenChange(true);
		expect(s.open).toBe(true);
		expect(s.target).toBe('x');
		s.onOpenChange(false);
		expect(s.open).toBe(false);
		expect(s.target).toBeNull();
	});

	it('close() clears both', () => {
		const s = createDialogState<string>();
		s.show('x');
		s.close();
		expect(s.open).toBe(false);
		expect(s.target).toBeNull();
	});

	it('showing another target replaces the first', () => {
		const s = createDialogState<string>();
		s.show('x');
		s.show('y');
		expect(s.target).toBe('y');
	});
});
