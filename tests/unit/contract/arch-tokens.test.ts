import { describe, expect, it } from 'vitest';
import {
	ALLOWED_ALPHA,
	PENDING_REGENERATION,
	colourNames,
	findAlphaModifiers,
	findColorScheme,
	findBareTextPrimary
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
	it('applies to src/lib/components/ui/** only (a border alpha is also held outside, see below)', () => {
		const cls = '<i class="hover:bg-primary/90"></i>';
		expect(flagged(cls, 'src/lib/features/x/X.svelte')).toEqual([]);
		expect(flagged(cls, 'src/lib/components/form/X.svelte')).toEqual([]);
		expect(flagged(cls, 'src\\lib\\components\\ui\\a\\a.svelte')).toEqual(['hover:bg-primary/90']);
	});
	it('has no file exempt: every primitive is regenerated or fixed', () => {
		expect([...PENDING_REGENERATION]).toEqual([]);
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

describe('check-tokens: the alpha forms the plain pattern misses (fix round A)', () => {
	it.each([
		'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
		'text-(--sidebar-fg)/50',
		'bg-(--x)/[0.4]'
	])('flags %s', (cls) => {
		expect(flagged(`<div class="x ${cls} y"></div>`)).toEqual([cls]);
	});

	it('flags a dynamic alpha in a template literal', () => {
		expect(flagged('const c = `bg-primary/${level}`;')).toEqual(['bg-primary/${']);
	});

	it('flags opacity on an element that may carry text, but not on a disabled control', () => {
		expect(flagged('<p class="[&>span]:opacity-70"></p>')).toEqual(['[&>span]:opacity-70']);
		expect(flagged('<p class="opacity-50"></p>')).toEqual(['opacity-50']);
		expect(flagged('<p class="disabled:opacity-50 data-disabled:opacity-60"></p>')).toEqual([]);
		expect(flagged('<p class="opacity-0 opacity-100 after:opacity-0"></p>')).toEqual([]);
	});

	it('applies to ui/ only', () => {
		expect(flagged('<p class="opacity-70"></p>', 'src/lib/features/x/X.svelte')).toEqual([]);
	});
});

describe('check-tokens: Tailwind scheme-* utilities', () => {
	it('flags scheme-dark and friends outside theme/semantic.css', () => {
		expect(findColorScheme('src/lib/x/X.svelte', '<div class="scheme-dark"></div>')).toHaveLength(
			1
		);
		expect(
			findColorScheme('src/lib/x/X.svelte', '<div class="dark:scheme-light-dark"></div>')
		).toHaveLength(1);
		expect(findColorScheme('src/styles/theme/semantic.css', '.scheme-dark {}')).toEqual([]);
	});
	it('does not flag unrelated names', () => {
		expect(findColorScheme('src/lib/x/X.svelte', '<div class="scheme-foo scheme"></div>')).toEqual(
			[]
		);
	});
});

describe('check-tokens: alpha on a border colour outside ui/ (fix round B)', () => {
	const NAMES = colourNames(
		'@theme { --color-destructive: x; --color-border: x; --color-ring: x; }'
	);
	const out = (src: string, rel = 'src/lib/features/leads/components/LeadsKanban.svelte') =>
		(findAlphaModifiers(rel, src, NAMES) as Array<{ utility: string }>).map((f) => f.utility);
	it.each(['border-destructive/40', 'border-s-destructive/40', 'hover:border-destructive/40'])(
		'flags %s in a feature file',
		(cls) => {
			expect(out(`<div class="x ${cls}"></div>`)).toEqual([cls]);
		}
	);
	it('still lets a feature file use other alpha forms (those are Task 16 rules)', () => {
		expect(out('<div class="bg-destructive/40"></div>')).toEqual([]);
	});
	it('does not flag a width or an opaque border token', () => {
		expect(
			out('<div class="border-s-4 border-destructive-indicator border-border"></div>')
		).toEqual([]);
	});
});

describe('check-tokens (m5): a bare text-primary', () => {
	const find = (src: string, rel = 'src/lib/layouts/X.svelte') =>
		(findBareTextPrimary(rel, src) as Array<{ name: string }>).length;
	it('flags text-primary, with variants', () => {
		expect(find('<a class="text-primary"></a>')).toBe(1);
		expect(find('<a class="hover:text-primary x"></a>')).toBe(1);
		expect(find("const c = 'text-primary';", 'src/lib/features/x/y.ts')).toBe(1);
	});
	it('accepts text-primary-text, text-primary-foreground and text-primary-indicator-foreground', () => {
		expect(find('<a class="text-primary-text"></a>')).toBe(0);
		expect(find('<a class="text-primary-foreground"></a>')).toBe(0);
		expect(find('<a class="text-primary-indicator-foreground"></a>')).toBe(0);
	});
	it('does not read the token layer', () => {
		expect(find('.x { color: red }', 'src/styles/base.css')).toBe(0);
	});
});
