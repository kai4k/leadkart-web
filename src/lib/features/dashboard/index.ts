/**
 * Dashboard feature barrel — purely composed feature (no API surface of
 * its own; reads from other features). Exempted from the api.ts
 * structural check in scripts/arch/check-feature-structure.mjs.
 *
 * Today the dashboard's only public surface is its components, which
 * routes import directly via $features/dashboard/components/<Name>.svelte.
 * This barrel exists to satisfy the architecture-test gate; expand it
 * if/when a dashboard service/view-model layer materialises.
 */
export {};
