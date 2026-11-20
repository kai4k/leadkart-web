import { saveTenantSection } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const toInt = (v: FormDataEntryValue | null) => {
			const n = Number((v ?? '').toString());
			return Number.isFinite(n) ? n : 0;
		};
		const toBool = (v: FormDataEntryValue | null) => (v ?? '').toString() === 'on';
		return saveTenantSection({
			event,
			form: fd,
			section: 'settings',
			payload: {
				password_policy: {
					min_length: toInt(fd.get('min_length')),
					require_uppercase: toBool(fd.get('require_uppercase')),
					require_lowercase: toBool(fd.get('require_lowercase')),
					require_digit: toBool(fd.get('require_digit')),
					require_symbol: toBool(fd.get('require_symbol')),
					max_failed_attempts: toInt(fd.get('max_failed_attempts')),
					lockout_minutes: toInt(fd.get('lockout_minutes'))
				}
			}
		});
	}
};
