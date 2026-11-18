/**
 * Single source of truth for the `$`-prefixed path aliases (relative to repo
 * root). Consumed by vite.config.ts (SvelteKit `alias`), vitest.config.ts and
 * depcruise.resolve.cjs (dependency-cruiser resolution).
 */
export const aliases = {
	$features: 'src/lib/features',
	$layouts: 'src/lib/layouts',
	$ui: 'src/lib/components/ui',
	$form: 'src/lib/components/form',
	$icons: 'src/lib/icons',
	$api: 'src/lib/api'
};
