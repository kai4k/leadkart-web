/**
 * A10 (plan G5): icons are all or none per menu group. A menu group is the run of items between separators or
 * inside one group element; a group that mixes iconned and plain items reads as ragged on glass.
 * Read from the source of each menu that exists today (UserMenu), so a later item cannot slip in unnoticed.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MENUS = ['src/lib/layouts/UserMenu.svelte'];

/** The items of each group of one menu source: split at separators and group boundaries. */
function groups(src: string): string[][] {
	const menu = src.slice(src.indexOf('<Dropdown.Menu'), src.indexOf('</Dropdown.Menu>'));
	return menu
		.split(
			/<Dropdown\.Separator|<\/?Dropdown\.Group|<\/?DropdownMenu\.Group|<DropdownMenu\.Separator/
		)
		.map((part) =>
			[...part.matchAll(/<Dropdown\.Item[\s\S]*?<\/Dropdown\.Item>/g)].map((m) => m[0])
		)
		.filter((g) => g.length > 0);
}

describe('menu groups: icons all or none', () => {
	it.each(MENUS)('%s', (file) => {
		const gs = groups(readFileSync(file, 'utf8'));
		expect(gs.length).toBeGreaterThan(0);
		for (const g of gs) {
			const withIcon = g.filter((item) => /<Icon\b|<\w+Icon\b/.test(item)).length;
			expect(
				withIcon === 0 || withIcon === g.length,
				`${file}: ${withIcon} of ${g.length} items have an icon`
			).toBe(true);
		}
	});
	it('the grouping reads a mixed group as mixed (self-test)', () => {
		const src =
			'<Dropdown.Menu><Dropdown.Item><Icon icon={A} />a</Dropdown.Item><Dropdown.Item>b</Dropdown.Item></Dropdown.Menu>';
		const [g] = groups(src);
		const withIcon = g.filter((item) => /<Icon\b/.test(item)).length;
		expect(withIcon > 0 && withIcon < g.length).toBe(true);
	});
});
