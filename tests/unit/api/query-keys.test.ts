import { describe, expect, it } from 'vitest';
import { queryRoots } from '#lib/api/query-keys.ts';

describe('queryRoots', () => {
	it('names the root prefix of each resource', () => {
		expect(queryRoots).toMatchObject({
			users: ['users'],
			roles: ['roles'],
			tenants: ['tenants'],
			permissionRequests: ['permission-requests'],
			mySessions: ['me', 'sessions']
		});
	});
});
