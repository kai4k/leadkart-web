import { describe, expect, it } from 'vitest';
import { cn } from '#lib/utils/cn.ts';

describe('cn: the material utilities are one class group', () => {
	it('a later material replaces an earlier one', () => {
		expect(cn('material-pane rounded-xl', 'material-bar')).toBe('rounded-xl material-bar');
		expect(cn('material-sidebar', 'material-sidebar-bar')).toBe('material-sidebar-bar');
	});
	it('a material conflicts with bg-* in both directions', () => {
		expect(cn('bg-popover p-2', 'material-pane')).toBe('p-2 material-pane');
		expect(cn('material-pane p-2', 'bg-card')).toBe('p-2 bg-card');
	});
	it('does not touch unrelated or variant backgrounds', () => {
		expect(cn('material-pane', 'hover:bg-accent')).toBe('material-pane hover:bg-accent');
	});
});
