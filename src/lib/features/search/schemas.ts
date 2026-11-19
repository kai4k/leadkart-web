/**
 * Zod schemas for the operator omni-search endpoint (GET /v1/search),
 * taken from the generated contract (leadkart-go/api/openapi.yaml).
 */
import { z } from 'zod';
import {
	SearchPersonHit as SearchPersonHitContract,
	SearchResponse as SearchResponseContract,
	SearchTenantHit as SearchTenantHitContract
} from '#lib/api/generated/index.ts';
import { responseEmail } from '#lib/api/response-schema.ts';

export const searchPersonHitSchema = SearchPersonHitContract.extend({ email: responseEmail });
export const searchTenantHitSchema = SearchTenantHitContract;
export const searchResponseSchema = SearchResponseContract.extend({
	persons: z.array(searchPersonHitSchema)
});

export type SearchPersonHit = z.output<typeof searchPersonHitSchema>;
export type SearchTenantHit = z.output<typeof searchTenantHitSchema>;
export type SearchResponse = z.output<typeof searchResponseSchema>;
