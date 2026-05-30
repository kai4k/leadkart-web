import { updateTenantSettingsSchema } from '$features/tenant/schemas';
import { patchTenant } from '../_actions';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		const toInt = (v: FormDataEntryValue | null) => {
			const n = Number((v ?? '').toString());
			return Number.isFinite(n) ? n : 0;
		};
		const toBool = (v: FormDataEntryValue | null) => (v ?? '').toString() === 'on';
		return patchTenant({
			cookies,
			pathSuffix: '/settings',
			schema: updateTenantSettingsSchema,
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
