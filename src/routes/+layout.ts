/**
 * Disable SSR globally — we ship a pure SPA via adapter-static. Each
 * route resolves client-side. SvelteKit prerendering is opt-in per
 * page via `export const prerender = true` if a route is genuinely
 * static (e.g. marketing pages, if added later).
 */
export const ssr = false;
export const prerender = false;
