/**
 * No prefetch on the inventory index — the list is filter-aware and
 * skeleton-driven. SSR-loading 50 rows on every navigation would cost
 * time + memory for marginal gain over the skeleton-then-pop pattern.
 */
export const prerender = false;
