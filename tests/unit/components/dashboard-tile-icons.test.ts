/** The brand tile icon on its primary-soft plate is a MARK: the indicator role (3:1 in every palette), never the vivid fill. The rule lives in StatCard's accent variants. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { statCardAccentVariants } from '#lib/components/ui/StatCard.svelte';

describe('dashboard tile icons', () => {
	it('the primary accent paints the icon with the indicator role on the soft plate', () => {
		const classes = statCardAccentVariants({ accent: 'primary' }).split(/\s+/);
		expect(classes).toContain('bg-primary-soft');
		expect(classes).toContain('text-primary-indicator');
		expect(classes).not.toContain('text-primary');
		expect(classes).not.toContain('bg-primary');
	});

	it.each(['PlatformDashboard', 'TenantAdminDashboard', 'TenantUserDashboard'])(
		'%s draws its brand tiles through StatCard, not its own icon plate',
		(name) => {
			const s = readFileSync(`src/lib/features/dashboard/components/${name}.svelte`, 'utf8');
			expect(s).toContain('<StatCard');
			expect(s).toContain("accent: 'primary'");
			expect(s).not.toContain('lk-dash-tile-icon');
		}
	);
});
