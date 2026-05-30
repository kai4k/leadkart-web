import { updateTenantStatutorySchema } from '$features/tenant/schemas';
import { patchTenant } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		return patchTenant({
			cookies,
			pathSuffix: '/statutory',
			schema: updateTenantStatutorySchema,
			payload: {
				gst_number: (fd.get('gst_number') ?? '').toString(),
				pan_number: (fd.get('pan_number') ?? '').toString(),
				drug_licence_number: (fd.get('drug_licence_number') ?? '').toString()
			}
		});
	}
};
