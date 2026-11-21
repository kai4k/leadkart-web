/** Plan G7: the shape language. Read from the sources: capsule controls, no `glass` card surface, medium-weight item labels. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] =>
	readdirSync(d).flatMap((n) =>
		statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]
	);

describe('shape language', () => {
	it('the misnamed Card surface="glass" is gone from src', () => {
		expect(readFileSync('src/lib/components/ui/card/card.svelte', 'utf8')).not.toMatch(/glass\s*:/);
		const hits = walk('src')
			.filter((f) => /\.(svelte|ts)$/.test(f))
			.filter((f) => /surface=["']glass["']/.test(readFileSync(f, 'utf8')));
		expect(hits).toEqual([]);
	});
	it('menu, select and command item labels are weight 500 on a rounded-lg item', () => {
		for (const f of [
			'dropdown-menu/dropdown-menu-item',
			'dropdown-menu/dropdown-menu-checkbox-item',
			'dropdown-menu/dropdown-menu-radio-item',
			'dropdown-menu/dropdown-menu-sub-trigger',
			'select/select-item',
			'command/command-item'
		]) {
			const s = readFileSync(`src/lib/components/ui/${f}.svelte`, 'utf8');
			expect(s, f).toContain('text-sm font-medium');
			expect(s, f).toContain('rounded-lg');
		}
	});
	it('the topbar and bulk bar controls are capsules; inputs stay rounded rectangles', () => {
		expect(readFileSync('src/lib/layouts/Topbar.svelte', 'utf8')).toContain('rounded-full');
		expect(readFileSync('src/lib/components/data/BulkActionBar.svelte', 'utf8')).toContain(
			'rounded-full'
		);
		expect(readFileSync('src/lib/components/ui/input/input.svelte', 'utf8')).toContain(
			'rounded-md'
		);
	});
});
