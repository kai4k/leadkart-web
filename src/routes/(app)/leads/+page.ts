/**
 * No prefetch on the leads index — the list is filter-aware and we
 * already start with skeletons via TanStack `isPending`. SSR-loading
 * 50 rows on every navigation would cost time + memory for marginal
 * UX gain over the skeleton-then-pop pattern that Stripe / Linear
 * use for high-cardinality lists.
 */
export const prerender = false;
