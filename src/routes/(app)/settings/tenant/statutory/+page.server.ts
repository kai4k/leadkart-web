import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		return saveTenantSection({
			event,
			form: fd,
			section: 'statutory',
			payload: {
				gst_number: (fd.get('gst_number') ?? '').toString(),
				pan_number: (fd.get('pan_number') ?? '').toString(),
				drug_licence_number: (fd.get('drug_licence_number') ?? '').toString()
			}
		});
	}
};
