import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		return saveTenantSection({
			cookies,
			section: 'display-preferences',
			payload: {
				locale: (fd.get('locale') ?? '').toString(),
				time_zone: (fd.get('time_zone') ?? '').toString(),
				date_format: (fd.get('date_format') ?? '').toString(),
				currency: (fd.get('currency') ?? '').toString()
			}
		});
	}
};
