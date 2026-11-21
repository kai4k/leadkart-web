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

describe('cn: background IMAGE utilities do not drop a material', () => {
	it.each([
		'bg-gradient-to-r',
		'bg-gradient-to-bl',
		'bg-linear-to-r',
		'bg-radial',
		'bg-conic-180',
		'bg-none',
		'bg-[url(/x.png)]'
	])('%s sits next to the material, in both orders', (img) => {
		expect(cn('material-pane', img)).toBe(`material-pane ${img}`);
		expect(cn(img, 'material-pane')).toBe(`${img} material-pane`);
	});
	it('a colour utility still replaces the material, and the other way round', () => {
		expect(cn('material-bar', 'bg-card')).toBe('bg-card');
		expect(cn('bg-gradient-to-r bg-card', 'material-bar')).toBe('bg-gradient-to-r material-bar');
	});
});
