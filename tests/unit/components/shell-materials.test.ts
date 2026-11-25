/**
 * G6: the shell is on materials, and what must stay opaque stays opaque (GD12). Read from the sources so the
 * classes are pinned without mounting the whole shell: the topbar and the bulk bar are the bar material, the
 * horizontal nav is the sidebar colour on a bar, the sidebar (desktop and the mobile sheet) is the sidebar
 * material, the auth card is glass; the context banners, the sticky table header and the tooltip take none.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = (p: string) => readFileSync(p, 'utf8');
const classes = (s: string) => s.split(/[\s"'`{}()]+/);

describe('the shell on materials', () => {
	it('the topbar is material-bar, keeps its search label, and has no bg-card or border-b of its own', () => {
		const s = src('src/lib/layouts/Topbar.svelte');
		const header = /<header[\s\S]*?>/.exec(s)![0];
		expect(classes(header)).toContain('material-bar');
		expect(classes(header)).not.toContain('bg-card');
		expect(classes(header)).not.toContain('border-b');
		expect(s).toContain("aria-label={$_('shell.searchLabel')}");
		// the search trigger is the control fill, a capsule, with no border of its own
		const search =
			/<button[^>]*shell\.searchLabel|<button[\s\S]*?aria-label=\{\$_\('shell\.searchLabel'\)\}/.exec(
				s
			)![0];
		expect(classes(search)).toContain('bg-muted');
		expect(classes(search)).toContain('rounded-full');
		expect(classes(search)).not.toContain('border');
	});

	it('the horizontal nav is the sidebar colour on a bar (GD17)', () => {
		const s = src('src/lib/layouts/HorizontalNav.svelte');
		const nav = /<nav[\s\S]*?>/.exec(s)![0];
		expect(classes(nav)).toContain('material-sidebar-bar');
		expect(classes(nav)).not.toContain('bg-sidebar');
		expect(classes(nav)).not.toContain('border-b');
		expect(s).toContain('aria-[current]:after:bg-sidebar-indicator');
	});

	it('the sidebar (desktop inner and the mobile sheet) is material-sidebar, without its own border or fill', () => {
		const s = src('src/lib/components/ui/sidebar/sidebar.svelte');
		const inner = /data-slot="sidebar-inner"[\s\S]*?class="([^"]*)"/.exec(s)![1];
		expect(classes(inner)).toContain('material-sidebar');
		expect(classes(inner)).not.toContain('bg-sidebar');
		expect(inner).not.toMatch(/border-sidebar-border|group-data-\[side=left\]:border-e/);
		expect(s).toMatch(/'material-sidebar p-0 text-sidebar-foreground/);
	});

	it('the nav icons use the sidebar icon token', () => {
		expect(src('src/lib/layouts/NavItem.svelte')).toMatch(
			/<NavIcon\s+class=\{active \? 'text-sidebar-accent-foreground' : 'text-sidebar-icon'\}/
		);
	});

	it('the bulk bar is a floating capsule on the bar material and the auth card is glass', () => {
		const bulk = src('src/lib/components/data/BulkActionBar.svelte');
		expect(bulk).toContain("'material-bar rounded-full sticky");
		expect(bulk).toContain('role="status"');
		expect(src('src/lib/components/ui/AuthCard.svelte')).toContain(
			"'lk-auth-card material-glass rounded-xl'"
		);
	});

	it('the tooltip is milk (spec 7.1: every overlay but the glass ones is milk)', () => {
		const tooltip = src('src/lib/components/ui/tooltip/tooltip-content.svelte');
		expect(tooltip).toContain('material-milk');
		expect(tooltip).not.toMatch(/material-(bar|glass|sidebar)/);
		expect(tooltip).not.toContain('bg-foreground');
	});

	it('the context banners, the sticky table header and typed toasts take no material (GD12)', () => {
		for (const p of [
			'src/lib/layouts/ContextBanner.svelte',
			'src/lib/layouts/TenantContextBanner.svelte',
			'src/lib/features/operator/impersonation/components/ImpersonationBanner.svelte',
			'src/lib/components/ui/table/table-header.svelte'
		])
			expect(src(p), p).not.toMatch(/material-(bar|glass|milk|sidebar)/);
		// the typed toast keeps its soft fill: the neutral toast is the only one the material is applied to
		expect(src('src/lib/components/ui/sonner/sonner.svelte')).toContain(
			'data-[type=default]:material-milk!'
		);
	});
});
