/**
 * Root key prefix of each resource's queries. Every feature's key factory builds on its root
 * (`[...queryRoots.users, 'list']`), and anything that must invalidate ANOTHER feature's
 * cache (a role delete changes the users views) uses the same root, never a literal.
 *
 * Only the roots in use are listed: a feature joins when its key factory is migrated.
 */
export const queryRoots = {
	users: ['users'],
	roles: ['roles'],
	tenants: ['tenants'],
	permissionRequests: ['permission-requests'],
	mySessions: ['me', 'sessions']
} as const;
