import { describe, expect, it } from 'vitest';
import {
	ALLOWED_ALPHA,
	PENDING_REGENERATION,
	colourNames,
	findAlphaModifiers,
	findColorScheme
} from '../../../scripts/arch/check-tokens.mjs';

/** Self-test of the token gate rules: fixtures, not the repository. */
const names = colourNames(
	'@theme { --color-primary: x; --color-ring: x; --color-input: x; --color-sidebar-foreground: x; --color-card: x; }'
);
const UI = 'src/lib/components/ui/button/button.svelte';
const flagged = (src: string, rel = UI) =>
	(findAlphaModifiers(rel, src, names) as Array<{ utility: string }>).map((f) => f.utility);

describe('check-tokens: alpha modifiers in ui/', () => {
	it.each([
		'hover:bg-primary/90',
		'ring-ring/50',
		'focus-visible:ring-ring/50',
		'text-sidebar-foreground/70',
		'dark:bg-input/30',
		'border-input/60',
		'bg-primary/[0.9]',
		'data-[state=open]:bg-card/80'
	])('flags %s', (cls) => {
		expect(flagged(`<div class="x ${cls} y"></div>`)).toEqual([cls]);
	});

	it('flags the same inside cn() strings and a ts file', () => {
		expect(
			flagged(`cn('a', cond && "hover:bg-primary/90")`, 'src/lib/components/ui/x/x.ts')
		).toEqual(['hover:bg-primary/90']);
	});
	it('reports the line', () => {
		const [f] = findAlphaModifiers(UI, 'a\nb\n<i class="ring-ring/50">', names);
		expect(f.line).toBe(3);
	});
	it('does not mistake sizes and fractions for colours', () => {
		expect(flagged('<p class="text-sm/6 w-1/2 h-2/3 basis-1/3 text-lg/7"></p>')).toEqual([]);
	});
	it('allows exactly the pinned scrims, and only unprefixed', () => {
		expect([...ALLOWED_ALPHA]).toEqual(['bg-black/50']);
		expect(flagged('<div class="bg-black/50"></div>')).toEqual([]);
		expect(flagged('<div class="bg-black/80"></div>')).toEqual(['bg-black/80']);
		expect(flagged('<div class="dark:bg-black/50"></div>')).toEqual(['dark:bg-black/50']);
	});
	it('applies to src/lib/components/ui/** only', () => {
		const cls = '<i class="hover:bg-primary/90"></i>';
		expect(flagged(cls, 'src/lib/features/x/X.svelte')).toEqual([]);
		expect(flagged(cls, 'src/lib/components/form/X.svelte')).toEqual([]);
		expect(flagged(cls, 'src\\lib\\components\\ui\\a\\a.svelte')).toEqual(['hover:bg-primary/90']);
	});
	it('exempts only the exact files pending regeneration', () => {
		for (const f of PENDING_REGENERATION)
			expect(flagged('<i class="bg-primary/90"></i>', f)).toEqual([]);
	});
});

describe('check-tokens: color-scheme', () => {
	it('is allowed in theme/semantic.css only', () => {
		const css = ':root { color-scheme: dark; }';
		expect(findColorScheme('src/styles/theme/semantic.css', css)).toEqual([]);
		expect(findColorScheme('src/styles/base.css', css)).toHaveLength(1);
		expect(
			findColorScheme('src/lib/x/X.svelte', '<style>.a { color-scheme: light dark }</style>')
		).toHaveLength(1);
		expect(
			findColorScheme('src/lib/x/X.svelte', '<div style="color-scheme:dark"></div>')
		).toHaveLength(1);
	});
	it('ignores comments and prefers-color-scheme', () => {
		expect(
			findColorScheme(
				'src/app.css',
				'/* color-scheme: dark */ @media (prefers-color-scheme: dark) {}'
			)
		).toEqual([]);
	});
});
