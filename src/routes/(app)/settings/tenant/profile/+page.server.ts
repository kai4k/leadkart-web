import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		return saveTenantSection({
			cookies,
			section: 'profile',
			payload: {
				legal_name: (fd.get('legal_name') ?? '').toString(),
				display_name: (fd.get('display_name') ?? '').toString()
			}
		});
	}
};
