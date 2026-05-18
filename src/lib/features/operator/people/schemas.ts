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
import { userDtoSchema } from '$lib/features/auth/schemas';

export const personDtoSchema = z.object({
	id: z.string(),
	email: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	is_active: z.boolean(),
	is_anonymised: z.boolean(),
	is_globally_suspended: z.boolean(),
	global_suspension_reason: z.string().optional().default(''),
	globally_suspended_at: z.string().optional().default(''),
	created_at: z.string(),
	anonymised_at: z.string().optional().default('')
});

export const listPersonMembershipsResponseSchema = z.object({
	memberships: z.array(userDtoSchema)
});

export const globalSuspendRequestSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

export const updatePersonProfileRequestSchema = z
	.object({
		first_name: z.string().min(1).max(120),
		last_name: z.string().min(1).max(120)
	})
	.strict();

export const anonymisePersonRequestSchema = z
	.object({ reason: z.string().min(1).max(500) })
	.strict();
