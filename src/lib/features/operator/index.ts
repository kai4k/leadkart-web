/**
 * Operator feature barrel — meta-feature housing platform-wide operator
 * surfaces (tenants directory, scope context, impersonation, person
 * lookup). Each submodule (`scope`, `tenants`, `impersonation`, `people`,
 * `dashboard`) ships its own api.ts/index.ts.
 *
 * This barrel is the required entry point for cross-feature imports from
 * outside `operator/` (it exports `platformStatsQuery`). Import from it as
 * `$features/operator`.
 */
export { platformStatsQuery } from './dashboard/queries.ts';
export { enterScopeMutation } from './scope';
