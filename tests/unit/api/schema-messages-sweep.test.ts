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
import { reassignLeadSchema, updateLeadSchema } from '$features/leads/schemas';
import {
	bulkOrderActionRequestSchema,
	cancelOrderRequestSchema,
	createQuotationRequestSchema,
	dispatchRequestSchema,
	markPackedRequestSchema,
	recordPaymentRequestSchema,
	reviseQuotationRequestSchema
} from '$features/orders/schemas';
import {
	createBatchRequestSchema,
	createMovementRequestSchema,
	createProductRequestSchema,
	writeOffBatchRequestSchema
} from '$features/inventory/schemas';
import { createRoleRequestSchema, updateRoleRequestSchema } from '$features/roles/schemas';
import { updateTenantProfileSchema } from '$features/tenant/schemas';
import { createUserRequestSchema, deactivateUserRequestSchema } from '$features/users/schemas';
import {
	registerTenantRequestSchema,
	suspendTenantRequestSchema
} from '#lib/features/operator/tenants/schemas.ts';
import { globalSuspendRequestSchema } from '#lib/features/operator/people/schemas.ts';
import en from '../../../src/lib/i18n/locales/en.json';
import { fieldMessageText, isCopyKey } from '#lib/utils/field-error-copy.ts';

/**
 * Whatever a stable feature's request schema says about a field a USER filled in must reach the
 * screen as a complete sentence: a catalogue key, or a sentence ending in a full stop. A raw Zod
 * default ("Too small: expected string to have >=12 characters") must never be shown.
 */
const long = (n: number) => 'x'.repeat(n);
const line = { product_id: '', batch_id: '', quantity: 0, unit_price: -1 };
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
	[
		'updateLead',
		updateLeadSchema,
		[
			{ gst_number: 'nope', pan_number: 'nope', notes: long(5000), email: 'x' },
			{ gst_number: '', pan_number: '' }
		]
	],
	[
		'reassignLead',
		reassignLeadSchema,
		[{ to_membership_id: '' }, { to_membership_id: 'a', reason: long(600) }]
	],
	[
		'createQuotation',
		createQuotationRequestSchema,
		[
			{ customer_lead_id: '', items: [] },
			{ customer_lead_id: 'x', items: [line] }
		]
	],
	['reviseQuotation', reviseQuotationRequestSchema, [{ items: [] }, { items: [line] }]],
	['markPacked', markPackedRequestSchema, [{ box_count: 0 }, { box_count: 1.5 }]],
	['dispatch', dispatchRequestSchema, [{ carrier: '' }, { notes: long(2000) }]],
	['cancelOrder', cancelOrderRequestSchema, [{ reason: '' }, { reason: long(2000) }]],
	[
		'recordPayment',
		recordPaymentRequestSchema,
		[
			{ kind: 'token', amount: 0, method: 'cash' },
			{ kind: 'nope', amount: -5, method: 'nope', reference: long(300) }
		]
	],
	['bulkOrderAction', bulkOrderActionRequestSchema, [{ ids: [], action: 'cancel' }]],
	[
		'createProduct',
		createProductRequestSchema,
		[
			{ brand_name: '', product_category: '', product_type: '', hsn_code: '12' },
			{ brand_name: long(300), mrp: -1, units_per_pack: 0, shelf_life_months: 0, hsn_code: 'abc' }
		]
	],
	[
		'createBatch',
		createBatchRequestSchema,
		[
			{ batch_number: '', manufactured_at: '', expires_at: '', quantity_received: 0 },
			{
				batch_number: 'b',
				manufactured_at: '2026-02-01',
				expires_at: '2026-01-01',
				quantity_received: 1.5,
				purchase_rate: 1
			},
			{
				batch_number: 'b',
				manufactured_at: '2026-02-01',
				expires_at: '2026-01-01',
				quantity_received: 1,
				purchase_rate: -1
			}
		]
	],
	['writeOffBatch', writeOffBatchRequestSchema, [{ reason: '' }, { reason: long(600) }]],
	['createMovement', createMovementRequestSchema, [{ delta: 0, reason: 'nope' }, { delta: 1.5 }]],
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
					const where = `${name}.${issue.path.join('.')}: ${m}`;
					const shown = fieldMessageText(m, (k) => get(_)(k));
					if (isCopyKey(m)) {
						// an authored message: a catalogue key with a full sentence
						expect(get(_)(m, { default: '' }), `${where}: no en.json entry`).toMatch(/\.$/);
						expect(shown, where).toMatch(/\.$/);
					} else {
						// anything else (a library default for a rule nobody gave a key) reads "Check this value."
						expect(shown, where).toBe(en.form.invalid);
					}
					expect(shown, where).not.toBe(m);
					expect(shown, where).not.toMatch(ZOD_DEFAULT);
				}
			}
			expect(issues).toBeGreaterThan(0);
		});
	}
});
