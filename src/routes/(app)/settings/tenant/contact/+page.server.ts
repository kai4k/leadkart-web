import { updateTenantAdminContactSchema } from '$features/tenant/schemas';
import { patchTenant } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		return patchTenant({
			cookies,
			pathSuffix: '/admin-contact',
			schema: updateTenantAdminContactSchema,
			// Every field is sent, blank as ''. Go rejects a body with a missing address field.
			payload: {
				phone: (fd.get('phone') ?? '').toString(),
				address: {
					street: (fd.get('address.street') ?? '').toString(),
					city: (fd.get('address.city') ?? '').toString(),
					district: (fd.get('address.district') ?? '').toString(),
					state: (fd.get('address.state') ?? '').toString(),
					state_code: (fd.get('address.state_code') ?? '').toString(),
					pincode: (fd.get('address.pincode') ?? '').toString()
				}
			}
		});
	}
};
