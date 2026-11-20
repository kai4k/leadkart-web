/**
 * The one save path of the five tenant-settings actions: authorise → validate → PATCH → map the
 * answer. Each section's `+page.server.ts` only turns its form into a payload.
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

export async function saveTenantSection<S extends TenantSection>({
	event,
	form,
	section,
	payload
}: {
	event: Pick<RequestEvent, 'cookies' | 'route'>;
	form: FormData;
	section: S;
	payload: TenantSectionBodies[S];
}) {
	const { cookies } = event;
	const refused = await authoriseAction(event, form, TENANT_SECTION_PERMISSION[section], payload);
	if (refused) return refused;

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
}
