/**
 * Operator feature barrel — meta-feature housing platform-wide operator
 * surfaces (tenants directory, scope context, impersonation, person
 * lookup). Each submodule (`scope`, `tenants`, `impersonation`, `people`,
 * `dashboard`) ships its own api.ts/index.ts.
 *
 * Callers typically import from a specific submodule
 * (`$features/operator/scope`, `$features/operator/tenants`, …) rather
 * than from the top-level barrel.
 */
export {};
