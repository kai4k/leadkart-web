/** The brand tile icon on its primary-soft plate is a MARK: the indicator role (3:1 in every palette), never the vivid fill. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('dashboard tile icons', () => {
	it.each(['PlatformDashboard', 'TenantAdminDashboard', 'TenantUserDashboard'])(
		'%s paints the brand icon with --primary-indicator',
		(name) => {
			const s = readFileSync(`src/lib/features/dashboard/components/${name}.svelte`, 'utf8');
			const block = /\.lk-dash-tile-icon--brand\s*\{([^}]*)\}/.exec(s)![1];
			expect(block).toContain('background: var(--primary-soft)');
			expect(block).toContain('color: var(--primary-indicator)');
			expect(block).not.toMatch(/color:\s*var\(--primary\)/);
		}
	);
});
