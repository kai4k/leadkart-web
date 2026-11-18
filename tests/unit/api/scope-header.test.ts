import { describe, expect, it } from 'vitest';
import { isOperatorScopePath } from '#lib/api/scope-header.ts';

describe('isOperatorScopePath', () => {
	it.each(['/operator/scope', '/operator/scope/members', '/operator/scope/settings/x'])(
		'%s is inside the scope tree',
		(path) => expect(isOperatorScopePath(path)).toBe(true)
	);

	it.each(['/operator/scopes', '/operator/scope-x', '/operator/tenants', '/operator', '/scope'])(
		'%s is not',
		(path) => expect(isOperatorScopePath(path)).toBe(false)
	);
});
