import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const files = [
	'src/lib/features/operator/tenants/components/CreateTenantDrawer.svelte',
	'src/lib/features/users/components/CreateUserDrawer.svelte'
];

/**
 * A password field that sets SOMEONE ELSE'S temporary password must not be autofilled with the
 * operator's own saved password (`current-password`), so it says `new-password`.
 */
describe('password fields that set another person’s password', () => {
	for (const file of files) {
		it(`${file} uses autocomplete="new-password"`, () => {
			const source = readFileSync(file, 'utf8');
			const fields = source.match(/<PasswordField[\s\S]*?\/>/g) ?? [];
			expect(fields.length).toBeGreaterThan(0);
			for (const field of fields) expect(field).toContain('autocomplete="new-password"');
		});
	}
});
