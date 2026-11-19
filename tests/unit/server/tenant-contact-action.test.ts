import { describe, expect, it, vi } from 'vitest';

const patchTenant = vi.hoisted(() => vi.fn(() => Promise.resolve({ ok: true })));
vi.mock('../../../src/routes/(app)/settings/tenant/_actions.ts', () => ({ patchTenant }));

import { actions } from '../../../src/routes/(app)/settings/tenant/contact/+page.server.ts';

describe('tenant contact action', () => {
	it('sends every address field, blank ones as empty strings (Go rejects a missing field)', async () => {
		const body = new FormData();
		body.set('phone', '');
		body.set('address.street', '1 Main Rd');
		// city, district, state, state_code, pincode left blank / absent
		body.set('address.city', '');
		await (actions.default as (e: never) => Promise<unknown>)({
			request: new Request('http://x/', { method: 'POST', body }),
			cookies: {}
		} as never);
		const call = patchTenant.mock.calls[0] as unknown as [{ payload: unknown }];
		expect(call[0].payload).toStrictEqual({
			phone: '',
			address: {
				street: '1 Main Rd',
				city: '',
				district: '',
				state: '',
				state_code: '',
				pincode: ''
			}
		});
	});
});
