/**
 * Audit feature barrel — public surface for cross-tenant activity reads.
 *
 * Per CLAUDE.md rule 9: audit is one of the legitimately "platform-wide"
 * features; it reads /v1/platform/persons/{id}/activity from operator
 * scope (allowlisted in scripts/arch/check-no-platform-paths.mjs).
 */
export * from './api';
export * from './schemas';
