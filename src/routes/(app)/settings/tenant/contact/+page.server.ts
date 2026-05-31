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
			payload: {
				phone: (fd.get('phone') ?? '').toString(),
				address: {
					street: (fd.get('address.street') ?? '').toString() || undefined,
					city: (fd.get('address.city') ?? '').toString() || undefined,
					district: (fd.get('address.district') ?? '').toString() || undefined,
					state: (fd.get('address.state') ?? '').toString() || undefined,
					state_code: (fd.get('address.state_code') ?? '').toString() || undefined,
					pincode: (fd.get('address.pincode') ?? '').toString() || undefined
				}
			}
		});
	}
};
