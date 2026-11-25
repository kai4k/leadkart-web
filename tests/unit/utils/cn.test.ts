import { describe, expect, it } from 'vitest';
import { cn } from '#lib/utils/cn.ts';

describe('cn: the material utilities are one class group', () => {
	it('a later material replaces an earlier one', () => {
		expect(cn('material-milk rounded-xl', 'material-bar')).toBe('rounded-xl material-bar');
		expect(cn('material-glass p-2', 'material-milk')).toBe('p-2 material-milk');
		expect(cn('material-sidebar', 'material-sidebar-bar')).toBe('material-sidebar-bar');
	});
	it.each(['sheet', 'clay', 'clay-sm', 'pebble', 'tray', 'trough'])(
		'the solid material-%s is in the group too',
		(m) => {
			expect(cn('material-bar p-2', `material-${m}`)).toBe(`p-2 material-${m}`);
			expect(cn(`material-${m} p-2`, 'material-milk')).toBe('p-2 material-milk');
			expect(cn(`material-${m}`, 'bg-card')).toBe('bg-card');
		}
	);
	it('a material conflicts with bg-* in both directions', () => {
		expect(cn('bg-popover p-2', 'material-milk')).toBe('p-2 material-milk');
		expect(cn('material-milk p-2', 'bg-card')).toBe('p-2 bg-card');
	});
	it('does not touch unrelated or variant backgrounds', () => {
		expect(cn('material-milk', 'hover:bg-accent')).toBe('material-milk hover:bg-accent');
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
		expect(cn('material-milk', img)).toBe(`material-milk ${img}`);
		expect(cn(img, 'material-milk')).toBe(`${img} material-milk`);
	});
	it('a colour utility still replaces the material, and the other way round', () => {
		expect(cn('material-bar', 'bg-card')).toBe('bg-card');
		expect(cn('bg-gradient-to-r bg-card', 'material-bar')).toBe('bg-gradient-to-r material-bar');
	});
});
