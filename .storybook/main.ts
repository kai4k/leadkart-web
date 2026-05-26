import type { StorybookConfig } from '@storybook/sveltekit';

/**
 * Storybook 10 — Svelte 5 + SvelteKit 2 + Vite 8 + Tailwind 4.
 *
 * Stories live next to the primitives they document
 * (src/lib/components/**\/*.stories.ts). Adding a primitive without a
 * companion story is caught at PR review for now; the
 * scripts/arch/check-component-inventory.mjs gate covers presence.
 *
 * Visual-regression Wave-3 wiring: run `npx storybook build` →
 * `npx test-storybook` (Playwright-driven snapshots committed to the
 * repo) once a meaningful proportion of primitives has stories. Until
 * then, snapshots aren't reliable enough to gate CI.
 */
const config: StorybookConfig = {
	framework: '@storybook/sveltekit',
	stories: [
		'../src/lib/components/**/*.stories.@(ts|svelte)',
		'../src/lib/features/**/*.stories.@(ts|svelte)'
	],
	addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-svelte-csf'],
	staticDirs: ['../static'],
	core: {
		disableTelemetry: true,
		disableWhatsNewNotifications: true
	},
	docs: {
		autodocs: 'tag'
	}
};

export default config;
