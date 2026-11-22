import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import type { z } from 'zod';
import {
	changePasswordSchema,
	loginRequestSchema,
	updateProfileRequestSchema
} from '$features/auth/schemas';
import {
	createPermissionRequestSchema,
	denyPermissionRequestSchema
} from '$features/permission-requests/schemas';
import { createRoleRequestSchema, updateRoleRequestSchema } from '$features/roles/schemas';
import { updateTenantProfileSchema } from '$features/tenant/schemas';
import { createUserRequestSchema, deactivateUserRequestSchema } from '$features/users/schemas';
import {
	registerTenantRequestSchema,
	suspendTenantRequestSchema
} from '#lib/features/operator/tenants/schemas.ts';
import { globalSuspendRequestSchema } from '#lib/features/operator/people/schemas.ts';
import { fieldMessageText, isCopyKey } from '#lib/utils/field-error-copy.ts';

/**
 * Whatever a stable feature's request schema says about a field a USER filled in must reach the
 * screen as a complete sentence: a catalogue key, or a sentence ending in a full stop. A raw Zod
 * default ("Too small: expected string to have >=12 characters") must never be shown.
 */
const long = (n: number) => 'x'.repeat(n);
const cases: [string, z.ZodType, Record<string, unknown>[]][] = [
	[
		'createRole',
		createRoleRequestSchema,
		[
			{ name: '', hierarchy_level: 50 },
			{ name: long(500), hierarchy_level: 50 },
			{ name: 'ok name', hierarchy_level: 0 },
			{ name: 'ok name', hierarchy_level: 500 },
			{ name: 'ok name', hierarchy_level: 1.5 }
		]
	],
	[
		'updateRole',
		updateRoleRequestSchema,
		[
			{ name: '', hierarchy_level: 0 },
			{ name: long(500), hierarchy_level: 500 }
		]
	],
	['tenantProfile', updateTenantProfileSchema, [{ legal_name: '', display_name: '' }]],
	[
		'accountProfile',
		updateProfileRequestSchema,
		[{ designation: long(500), department: long(500), status_message: long(500) }]
	],
	[
		'permissionRequest',
		createPermissionRequestSchema,
		[
			{ permission: '', reason: '' },
			{ permission: 'x', reason: long(5000) },
			{ permission: 'x', reason: long(20), duration_days: 0 },
			{ permission: 'x', reason: long(20), duration_days: 91 }
		]
	],
	[
		'denyRequest',
		denyPermissionRequestSchema,
		[{ decision_reason: '' }, { decision_reason: long(5000) }]
	],
	[
		'changePassword',
		changePasswordSchema,
		[
			{ current_password: '', new_password: 'Ab1!' },
			{ current_password: long(5000), new_password: long(5000) }
		]
	],
	[
		'login',
		loginRequestSchema,
		[
			{ email: '', password: '' },
			{ email: long(400), password: long(5000) }
		]
	],
	[
		'createUser',
		createUserRequestSchema,
		[
			{ email: '', first_name: '', last_name: '', password: 'short' },
			{ email: 'nope', first_name: long(500), last_name: long(500), password: long(5000) }
		]
	],
	['deactivateUser', deactivateUserRequestSchema, [{ reason: '' }, { reason: long(600) }]],
	[
		'registerTenant',
		registerTenantRequestSchema,
		[
			{
				slug: '',
				legal_name: '',
				display_name: '',
				admin_email: '',
				admin_password: 'short',
				admin_first_name: '',
				admin_last_name: ''
			},
			{
				slug: 'a',
				legal_name: long(500),
				display_name: long(500),
				admin_email: 'x',
				admin_password: long(5000),
				admin_first_name: long(500),
				admin_last_name: long(500)
			},
			{
				slug: long(500),
				legal_name: 'ok name',
				display_name: 'ok name',
				admin_email: 'a@b.co',
				admin_password: 'Abcdefg1!xyz',
				admin_first_name: 'a',
				admin_last_name: 'b'
			},
			{
				slug: '-bad-',
				legal_name: 'ok name',
				display_name: 'ok name',
				admin_email: 'a@b.co',
				admin_password: 'Abcdefg1!xyz',
				admin_first_name: 'a',
				admin_last_name: 'b'
			}
		]
	],
	['suspendTenant', suspendTenantRequestSchema, [{ reason: '' }]],
	['globalSuspend', globalSuspendRequestSchema, [{ reason: '' }, { reason: long(600) }]]
];

const ZOD_DEFAULT = /^(Too (small|big)|Invalid (input|string|number|option|value|format))/;

describe('no raw Zod default reaches a user', () => {
	for (const [name, schema, inputs] of cases) {
		it(name, () => {
			let issues = 0;
			for (const input of inputs) {
				const r = schema.safeParse(input);
				for (const issue of r.error?.issues ?? []) {
					if (issue.code === 'unrecognized_keys') continue;
					issues++;
					const m = issue.message;
					expect(m, `${name}.${issue.path.join('.')}: ${m}`).not.toMatch(ZOD_DEFAULT);
					if (isCopyKey(m)) {
						expect(get(_)(m, { default: '' }), `${name}: no en.json entry for ${m}`).toMatch(/\.$/);
					} else {
						expect(m, `${name}.${issue.path.join('.')}`).toMatch(/\.$/);
					}
					expect(fieldMessageText(m, (k) => get(_)(k))).toMatch(/\.$/);
				}
			}
			expect(issues).toBeGreaterThan(0);
		});
	}
});
