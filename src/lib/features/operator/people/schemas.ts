/**
 * Zod schemas for operator-side Person management.
 *
 * PersonDto mirrors the leadkart-go `identity/ports/dto.go` PersonDto
 * field-for-field. All request schemas are `.strict()` so extra keys
 * thrown at the boundary are caught before they reach the server.
 *
 * `userDtoSchema` is reused from the auth feature — UserDto models a
 * Membership and is the same shape whether fetched from the auth
 * context or from the platform persons/memberships endpoint.
 */
import { z } from 'zod';
import { ListPersonMembershipsResponse, PersonDto } from '#lib/api/generated/index.ts';
import { userDtoSchema } from '#lib/features/auth/schemas.ts';

/** The suspension / anonymisation fields are omitzero in Go; an absent value is read as ''. */
export const personDtoSchema = PersonDto.extend({
	global_suspension_reason: z.string().default(''),
	globally_suspended_at: z.string().default(''),
	anonymised_at: z.string().default('')
});

export const listPersonMembershipsResponseSchema = ListPersonMembershipsResponse.extend({
	memberships: z.array(userDtoSchema)
});

export const globalSuspendRequestSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

export const anonymisePersonRequestSchema = z
	.object({ reason: z.string().min(1).max(500) })
	.strict();

export const personListResponseSchema = z.object({
	persons: z.array(personDtoSchema),
	next_cursor: z.string().nullable().optional()
});
