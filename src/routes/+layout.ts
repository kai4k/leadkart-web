/**
 * Root layout load. With adapter-node, SSR is enabled by default.
 * Individual route groups opt out as needed:
 *   (auth) routes: ssr = false (no server secrets needed for public pages)
 *   (app) routes: SSR on (server loads run for auth guard + capabilities)
 *
 * prerender is false globally — we ship a Node server, not a static site.
 */
export const prerender = false;
