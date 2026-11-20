/**
 * Persona x context: which actions each caller is offered at home and inside an operator's tenant
 * context. In another tenant Go accepts a caller for an identity route only as a super user or by the
 * `platform.*` equivalent; an own-tenant `identity.*` name (tenant.admin implied, or granted) does not
 * count there. Personas are built by Go's projection rules (tests/support/go-personas.ts).
 */
import { describe, expect, it } from 'vitest';
import { canAny } from '#lib/features/auth/capabilities.ts';
import { ACTION, P } from '#lib/features/auth/permissions.ts';
import {
	NEW_TENANT_ADMIN,
	OPERATOR_PLATFORM_ADMIN,
	OWNER,
	persona,
	SUPER_USER
} from '../../../support/go-personas.ts';

const IDENTITY_ACTIONS = [
	'userView',
	'userCreate',
	'userUpdate',
	'userDeactivate',
	'userReactivate',
	'userOverrides',
	'roleAssign',
	'roleRevoke',
	'roleCreate',
	'roleUpdate',
	'roleDelete'
] as const;

/** A platform operator who is ALSO the owner of the platform tenant and holds platform.users.view only. */
const OPERATOR_AND_OWNER = persona({
	isPlatform: true,
	roles: ['Company Owner'],
	grants: [P.platformTenantsView, P.platformUsersView]
});
const ROLES_MANAGER = persona({
	isPlatform: true,
	grants: [P.platformTenantsView, P.platformRolesManage]
});
const USERS_MANAGER = persona({
	isPlatform: true,
	grants: [P.platformTenantsView, P.platformUsersManage]
});

describe('at home (own tenant): the identity.* names count', () => {
	it.each([
		['owner', OWNER],
		['administrator', NEW_TENANT_ADMIN]
	])('a tenant %s is offered every identity action', (_n, who) => {
		for (const a of IDENTITY_ACTIONS) expect(canAny(who, ACTION[a], false), a).toBe(true);
	});
});

describe('inside a tenant context', () => {
	it('an operator who also owns the platform tenant is offered no write: Go would answer 403 to each', () => {
		for (const a of IDENTITY_ACTIONS) {
			if (a === 'userView') continue; // a read: platform.users.view is the equivalent they hold
			expect(canAny(OPERATOR_AND_OWNER, ACTION[a], true), a).toBe(false);
		}
		expect(canAny(OPERATOR_AND_OWNER, ACTION.userView, true)).toBe(true);
	});

	it('platform.users.manage unlocks the member actions, platform.roles.manage the role actions', () => {
		for (const a of [
			'userView',
			'userCreate',
			'userUpdate',
			'userDeactivate',
			'userReactivate',
			'userOverrides'
		] as const) {
			expect(canAny(USERS_MANAGER, ACTION[a], true), a).toBe(true);
			expect(canAny(ROLES_MANAGER, ACTION[a], true), a).toBe(false);
		}
		for (const a of [
			'roleAssign',
			'roleRevoke',
			'roleCreate',
			'roleUpdate',
			'roleDelete'
		] as const) {
			expect(canAny(ROLES_MANAGER, ACTION[a], true), a).toBe(true);
			expect(canAny(USERS_MANAGER, ACTION[a], true), a).toBe(false);
		}
	});

	it('the full platform operator keeps everything the platform names give', () => {
		for (const a of IDENTITY_ACTIONS)
			expect(canAny(OPERATOR_PLATFORM_ADMIN, ACTION[a], true), a).toBe(true);
	});

	it('a super user keeps every identity action', () => {
		for (const a of IDENTITY_ACTIONS) expect(canAny(SUPER_USER, ACTION[a], true), a).toBe(true);
	});

	it('nobody is offered a permission-request submit (Go: tenant_scope_not_supported)', () => {
		for (const who of [OWNER, OPERATOR_PLATFORM_ADMIN, SUPER_USER]) {
			expect(canAny(who, ACTION.requestSubmit, true)).toBe(false);
		}
	});
});
