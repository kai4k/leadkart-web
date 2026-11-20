import { afterEach, describe, expect, it } from 'vitest';
import { inlineEndSide } from '#lib/utils/direction.ts';

afterEach(() => document.documentElement.removeAttribute('dir'));

describe('inlineEndSide', () => {
	it('is the right edge in LTR and the left edge in RTL', () => {
		expect(inlineEndSide()).toBe('right');
		document.documentElement.setAttribute('dir', 'rtl');
		expect(inlineEndSide()).toBe('left');
	});
	it('reads the element it is given', () => {
		const el = document.createElement('div');
		el.setAttribute('dir', 'rtl');
		document.body.append(el);
		expect(inlineEndSide(el)).toBe('left');
		el.remove();
	});
});
