/**
 * The one save path of the five tenant-settings actions: authorise → validate → PATCH → map the
 * answer. Each section's `+page.server.ts` is `{ default: saveTenantSection('<section>') }`: the
 * helper RETURNS the action, so the walker proves it once (its returned function holds the
 * positional contract: `formData()`, then the guard, then `if (refused) return refused;`, nothing
 * else before the guard) and every page only names its section as a literal.
 *
 * The permission per section is the one table in `config/tenant-sections.ts` (what Go's route
 * requires). The check runs before any write to Go; Go stays the enforcer.
 * Go's PATCH routes are full-replace, so the gateway (`features/tenant/server.ts`) always sends
 * every field; field errors come back keyed by field (nested keys dotted) and land on the form.
 */
import type { RequestEvent } from '@sveltejs/kit';
import { TENANT_SECTION_PERMISSION } from '#lib/config/tenant-sections.ts';
import {
	authoriseAction,
	failForm,
	failFromGo,
	failOutage,
	zodFieldMessages
} from '#lib/server/form-action.ts';
import {
	ownTenantId,
	patchTenant,
	TENANT_SECTIONS,
	type TenantSection,
	type TenantSectionBodies
} from '$features/tenant/server';

const text = (fd: FormData, key: string): string => (fd.get(key) ?? '').toString();
const toInt = (fd: FormData, key: string): number => {
	const n = Number(text(fd, key));
	return Number.isFinite(n) ? n : 0;
};
const toBool = (fd: FormData, key: string): boolean => text(fd, key) === 'on';

/** What each section's form submits, as the payload the gateway validates and sends. */
const SECTION_FORMS: { [S in TenantSection]: (fd: FormData) => TenantSectionBodies[S] } = {
	profile: (fd) => ({ legal_name: text(fd, 'legal_name'), display_name: text(fd, 'display_name') }),
	statutory: (fd) => ({
		gst_number: text(fd, 'gst_number'),
		pan_number: text(fd, 'pan_number'),
		drug_licence_number: text(fd, 'drug_licence_number')
	}),
	'admin-contact': (fd) => ({
		phone: text(fd, 'phone'),
		address: {
			street: text(fd, 'address.street'),
			city: text(fd, 'address.city'),
			district: text(fd, 'address.district'),
			state: text(fd, 'address.state'),
			state_code: text(fd, 'address.state_code'),
			pincode: text(fd, 'address.pincode')
		}
	}),
	'display-preferences': (fd) => ({
		locale: text(fd, 'locale'),
		time_zone: text(fd, 'time_zone'),
		date_format: text(fd, 'date_format'),
		currency: text(fd, 'currency')
	}),
	settings: (fd) => ({
		password_policy: {
			min_length: toInt(fd, 'min_length'),
			require_uppercase: toBool(fd, 'require_uppercase'),
			require_lowercase: toBool(fd, 'require_lowercase'),
			require_digit: toBool(fd, 'require_digit'),
			require_symbol: toBool(fd, 'require_symbol'),
			max_failed_attempts: toInt(fd, 'max_failed_attempts'),
			lockout_minutes: toInt(fd, 'lockout_minutes')
		}
	})
};

export function saveTenantSection<S extends TenantSection>(section: S) {
	return async (event: RequestEvent) => {
		const form = await event.request.formData();
		const refused = await authoriseAction(event, form, TENANT_SECTION_PERMISSION[section], () =>
			SECTION_FORMS[section](form)
		);
		if (refused) return refused;
		const { cookies } = event;
		const payload = SECTION_FORMS[section](form);

		const parsed = TENANT_SECTIONS[section].schema.safeParse(payload);
		if (!parsed.success) {
			return failForm(422, { values: payload, fieldMessages: zodFieldMessages(parsed.error) });
		}

		// What was validated is what is sent.
		const call = await patchTenant(
			cookies,
			ownTenantId(cookies),
			section,
			parsed.data as TenantSectionBodies[S]
		);
		if (!call.ok) return failOutage(call, payload);
		if (call.resp.ok) return { success: true as const };
		return failFromGo(call.resp, payload);
	};
}
