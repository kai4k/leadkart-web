import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		return saveTenantSection({
			event,
			form: fd,
			section: 'profile',
			payload: {
				legal_name: (fd.get('legal_name') ?? '').toString(),
				display_name: (fd.get('display_name') ?? '').toString()
			}
		});
	}
};
