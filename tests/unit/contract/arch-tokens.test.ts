import { describe, expect, it } from 'vitest';
import {
	ALLOWED_ALPHA,
	PENDING_REGENERATION,
	colourNames,
	findAlphaModifiers,
	findColorScheme,
	findBareTextPrimary,
	findBackdrop,
	findMaterialTokens,
	findPrimaryMarks,
	findTextOnControl,
	findWillChange,
	PRIMARY_MARK_ALLOWLIST
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
	it('allows no alpha at all (m2): the scrim is the bg-scrim token', () => {
		expect([...ALLOWED_ALPHA]).toEqual([]);
		expect(flagged('<div class="bg-black/50"></div>')).toEqual(['bg-black/50']);
		expect(flagged('<div class="bg-scrim"></div>')).toEqual([]);
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

describe('check-tokens (m5, fix round D): the vivid primary is a fill, a mark is primary-indicator', () => {
	const marks = (src: string, rel = 'src/lib/features/x/X.svelte') =>
		(findPrimaryMarks(rel, src) as Array<{ name: string }>).map((m) => m.name);
	it.each([
		'border-primary',
		'ring-primary',
		'outline-primary',
		'divide-primary',
		'fill-primary',
		'stroke-primary',
		'border-l-primary',
		'border-s-primary',
		'hover:border-primary',
		'group-aria-checked/tile:ring-primary',
		'dark:has-data-checked:border-primary'
	])('refuses a bare %s anywhere under src/', (cls) => {
		expect(marks(`<i class="${cls} x"></i>`)).toHaveLength(1);
		expect(marks(`const c = '${cls}';`, 'src/lib/x/y.ts')).toHaveLength(1);
	});
	it('accepts the indicator role and the other primary tokens', () => {
		expect(
			marks(
				'<i class="border-primary-indicator ring-primary-indicator bg-primary-soft text-primary-text ring-offset-popover border-primary-foreground"></i>'
			)
		).toEqual([]);
	});
	it('bg-primary needs a label on the same line (text-primary-foreground, any variant), else it is a mark', () => {
		expect(marks('<b class="bg-primary text-primary-foreground"></b>')).toEqual([]);
		expect(marks('<b class="hover:bg-primary hover:text-primary-foreground"></b>')).toEqual([]);
		expect(marks("primary: 'bg-primary',")).toEqual(['bg-primary']);
		expect(marks("iconAccent === 'primary' && 'bg-primary',")).toEqual(['bg-primary']);
		expect(marks('<i class="bg-primary-indicator bg-primary-soft bg-primary-hover"></i>')).toEqual(
			[]
		);
	});
	it('bg-primary is free in the Button, Badge and Checkbox family files', () => {
		expect(marks("v: 'bg-primary',", 'src/lib/components/ui/button/button.svelte')).toEqual([]);
		expect(marks("v: 'bg-primary',", 'src/lib/components/ui/badge/badge.svelte')).toEqual([]);
		expect(marks("v: 'bg-primary',", 'src/lib/components/ui/checkbox/checkbox.svelte')).toEqual([]);
		expect(
			marks("v: 'bg-primary',", 'src/lib/components/ui/progress/progress.svelte')
		).toHaveLength(1);
	});
	it('a comment that names the class is not a use, and CSS files are not scanned', () => {
		expect(marks('<!-- border-primary -->\n// ring-primary\n/* bg-primary */')).toEqual([]);
		expect(marks('.x { border-color: red }', 'src/styles/base.css')).toEqual([]);
	});
	it('the allowlist of bare marks is exact and empty', () => {
		expect(PRIMARY_MARK_ALLOWLIST).toEqual([]);
	});
});

describe('check-tokens (m6, fix round D): no primary-text / destructive text on a control fill in a material', () => {
	const hits = (
		src: string,
		rel = 'src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte'
	) => (findTextOnControl(rel, src) as Array<{ name: string }>).map((m) => m.name);
	it('refuses the pair in one variant chain, in the files that render on a material', () => {
		expect(hits('<i class="bg-accent text-destructive"></i>')).toHaveLength(1);
		expect(hits('<i class="focus:bg-accent focus:text-primary-text"></i>')).toHaveLength(1);
		expect(
			hits('<i class="bg-muted text-primary-text"></i>', 'src/lib/layouts/Topbar.svelte')
		).toHaveLength(1);
	});
	it('a different state chain is a different element state: allowed (the destructive menu item)', () => {
		expect(
			hits(
				'<i class="focus:bg-accent data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive-soft"></i>'
			)
		).toEqual([]);
	});
	it('foreground, muted and accent text on a control fill are fine; content files are not scanned', () => {
		expect(hits('<i class="bg-accent text-accent-foreground text-muted-foreground"></i>')).toEqual(
			[]
		);
		expect(
			hits('<i class="bg-muted text-destructive"></i>', 'src/lib/features/x/X.svelte')
		).toEqual([]);
	});
});

describe('check-tokens (m1, m3, m4): where a material may be written', () => {
	const f = (fn: (rel: string, src: string) => unknown[], rel: string, src: string) =>
		fn(rel, src).length;
	it('m1: a backdrop utility in a component fails', () => {
		expect(f(findBackdrop, 'src/lib/x/X.svelte', '<div class="backdrop-blur-sm"></div>')).toBe(1);
		expect(
			f(findBackdrop, 'src/lib/x/X.svelte', '<div class="supports-backdrop-filter:bg-card"></div>')
		).toBe(1);
		expect(
			f(findBackdrop, 'src/lib/x/X.svelte', '<div class="hover:backdrop-saturate-150"></div>')
		).toBe(1);
	});
	it('m1: the CSS property fails in a layout <style>, and passes in utilities.css and the material files', () => {
		const css = '.a { backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }';
		expect(f(findBackdrop, 'src/lib/layouts/X.svelte', `<style>${css}</style>`)).toBe(2);
		expect(f(findBackdrop, 'src/styles/utilities.css', css)).toBe(0);
		expect(f(findBackdrop, 'src/styles/theme/materials.css', css)).toBe(0);
		expect(f(findBackdrop, 'src/styles/theme/materials-fallbacks.css', css)).toBe(0);
		expect(f(findBackdrop, 'src/styles/theme/layouts.css', css)).toBe(0);
		expect(f(findBackdrop, 'src/styles/base.css', css)).toBe(2);
	});
	it('m1: a comment that names backdrop-filter is not a use', () => {
		expect(
			f(
				findBackdrop,
				'src/lib/x/X.svelte',
				'<!-- backdrop-filter -->\n// backdrop-blur-sm\n/* backdrop-filter */'
			)
		).toBe(0);
	});
	it('m2: bg-black/50 is refused now that no alpha is allowed (the scrim is bg-scrim)', () => {
		expect(
			(
				findAlphaModifiers(
					'src/lib/components/ui/dialog/x.svelte',
					'<i class="bg-black/50"></i>',
					names
				) as unknown[]
			).length
		).toBe(1);
	});
	it('m3: a --material-* or --scrim declaration outside theme/materials*.css fails', () => {
		expect(
			f(findMaterialTokens, 'src/lib/x/X.svelte', '<div style="--material-bar-fill: red"></div>')
		).toBe(1);
		expect(f(findMaterialTokens, 'src/styles/base.css', ':root { --scrim: red; }')).toBe(1);
		expect(
			f(
				findMaterialTokens,
				'src/styles/theme/materials.css',
				':root { --scrim: red; --material-bar-fill: red; }'
			)
		).toBe(0);
	});
	it('m3: var(--material-*) is legal in src/styles and in a layout <style> block, nowhere else', () => {
		const ref = 'background: var(--material-bar-fill);';
		expect(f(findMaterialTokens, 'src/styles/utilities.css', ref)).toBe(0);
		expect(f(findMaterialTokens, 'src/lib/layouts/X.svelte', `<style>.a { ${ref} }</style>`)).toBe(
			0
		);
		expect(
			f(
				findMaterialTokens,
				'src/lib/layouts/X.svelte',
				'<div class="bg-(--material-bar-fill)" style="background: var(--material-bar-fill)"></div>'
			)
		).toBe(1);
		expect(
			f(findMaterialTokens, 'src/lib/features/x/X.svelte', `<style>.a { ${ref} }</style>`)
		).toBe(1);
	});
	it('m4: will-change fails everywhere but animations.css', () => {
		expect(
			f(findWillChange, 'src/lib/layouts/X.svelte', '<style>.a { will-change: transform; }</style>')
		).toBe(1);
		expect(
			f(findWillChange, 'src/lib/x/X.svelte', '<div class="will-change-transform"></div>')
		).toBe(1);
		expect(f(findWillChange, 'src/styles/animations.css', '.a { will-change: transform; }')).toBe(
			0
		);
		expect(f(findWillChange, 'src/lib/x/X.svelte', '// will-change is banned')).toBe(0);
	});
});
