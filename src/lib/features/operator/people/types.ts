/**
 * Inferred types for operator-side Person management.
 *
 * All types are derived from their Zod schemas so the type definitions
 * stay in lock-step with the runtime validators — no manual drift.
 */
import type { z } from 'zod';
import type {
	personDtoSchema,
	listPersonMembershipsResponseSchema,
	personListResponseSchema,
	globalSuspendRequestSchema,
	updatePersonProfileRequestSchema,
	anonymisePersonRequestSchema
} from './schemas';

export type PersonDto = z.output<typeof personDtoSchema>;
export type ListPersonMembershipsResponse = z.output<typeof listPersonMembershipsResponseSchema>;
export type PersonListResponse = z.output<typeof personListResponseSchema>;
export type GlobalSuspendRequest = z.output<typeof globalSuspendRequestSchema>;
export type UpdatePersonProfileRequest = z.output<typeof updatePersonProfileRequestSchema>;
export type AnonymisePersonRequest = z.output<typeof anonymisePersonRequestSchema>;
