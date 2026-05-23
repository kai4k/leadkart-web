/**
 * Zod schemas for the operator omni-search endpoint (GET /v1/search).
 * Source: leadkart-go/api/openapi.yaml — keep in sync via codegen.
 */
import { z } from 'zod';

export const searchPersonHitSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	first_name: z.string(),
	last_name: z.string(),
	created_at: z.string()
});

export const searchTenantHitSchema = z.object({
	id: z.string().uuid(),
	slug: z.string(),
	legal_name: z.string(),
	display_name: z.string(),
	status: z.string(),
	created_at: z.string()
});

export const searchResponseSchema = z.object({
	persons: z.array(searchPersonHitSchema),
	tenants: z.array(searchTenantHitSchema),
	has_partial: z.boolean()
});

export type SearchPersonHit = z.output<typeof searchPersonHitSchema>;
export type SearchTenantHit = z.output<typeof searchTenantHitSchema>;
export type SearchResponse = z.output<typeof searchResponseSchema>;
