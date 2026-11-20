import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		return saveTenantSection({
			event,
			form: fd,
			section: 'admin-contact',
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
