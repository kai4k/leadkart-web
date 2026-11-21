import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = (p: string) => readFileSync(p, 'utf8');

describe('legacy Drawer close button', () => {
	const header = src('src/lib/components/ui/drawer/drawer-header.svelte');
	it('sits at the header inline-end corner, not under the title', () => {
		expect(header).toContain('relative');
		expect(header).toContain('[&>button]:absolute');
		expect(header).toContain('[&>button]:end-3');
		expect(header).toContain('[&>button]:top-3');
		expect(header).toContain('pe-14'); // the title never runs under it
	});
	it('is at least 24 x 24 with a visible (keyboard) focus ring', () => {
		expect(header).toContain('[&>button]:min-h-6');
		expect(header).toContain('[&>button]:min-w-6');
		expect(header).toContain('[&>button]:focus-visible:ring-2');
		expect(header).not.toMatch(/\[&>button\]:focus:/);
	});
});

describe('avatar sizes use real utilities', () => {
	for (const f of ['avatar', 'avatar-group']) {
		it(`${f}: size-N, never the non-existent inline-size-N / block-size-N`, () => {
			const s = src(`src/lib/components/ui/avatar/${f}.svelte`);
			expect(s).not.toMatch(/\b(inline|block)-size-\d/);
			expect(s).toMatch(/\bsize-\d+/);
		});
	}
	it('an avatar never shrinks in a flex row', () => {
		expect(src('src/lib/components/ui/avatar/avatar.svelte')).toContain('shrink-0');
	});
});

describe('command palette combobox wiring', () => {
	const list = src('src/lib/components/ui/command/command-list.svelte');
	it('the bits Viewport is the named listbox (bits points the input aria-controls at it)', () => {
		expect(list).toContain('CommandPrimitive.Viewport');
		expect(list).toContain('role="listbox"');
		expect(list).toMatch(/aria-label=\{ariaLabel \?\? \$_\('common\.commandPalette\.results'\)\}/);
		expect(list).toContain('role="presentation"'); // the List element is only the scroll box
	});
});

describe('lead row status dot', () => {
	it('has an image role, so its label is allowed', () => {
		const t = src('src/lib/features/leads/components/LeadsTable.svelte');
		expect(t).toMatch(/role="img"\s+aria-label="Stale lead"/);
	});
});

describe('neutral toasts and stacked modals (fix round F)', () => {
	const sonner = readFileSync('src/lib/components/ui/sonner/sonner.svelte', 'utf8');
	const css = readFileSync('src/styles/utilities.css', 'utf8');
	it('the toast material targets the type svelte-sonner really renders (data-type="default" / "loading")', () => {
		expect(sonner).toContain('data-[type=default]:material-pane!');
		expect(sonner).toContain('data-[type=loading]:material-pane!');
		expect(sonner).not.toContain('not-data-[type]');
		expect(css).toContain("[data-sonner-toast]:is([data-type='default'], [data-type='loading'])");
		expect(css).not.toContain(':not([data-type])');
	});
	it('a modal with an open modal before it among the portals is opaque (general-sibling rule)', () => {
		expect(css).toMatch(/\)\[data-state='open'\]\s*~\s*:is\(\s*\[data-slot='dialog-content'\]/);
	});
});
