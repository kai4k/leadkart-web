import { tick } from 'svelte';

/** A modal surface rendered without an accessible name (a developer error, not an API one). */
export class OverlayNameError extends Error {}

/**
 * Dev-time guard: a modal surface (Dialog, Sheet, Drawer shim) must have an accessible name, either
 * a `title` prop, a rendered `Title` part (bits-ui links it through `aria-labelledby`), or an
 * `aria-label`. Throws in development and tests; a no-op in a production build.
 *
 * Runs after a tick because a `Title` part registers itself after the content mounts.
 */
export async function assertOverlayName(el: HTMLElement | null, surface: string): Promise<void> {
	if (!import.meta.env.DEV || !el) return;
	await tick();
	if (!el.isConnected) return;
	if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
	throw new OverlayNameError(
		`${surface}.Content has no accessible name: pass \`title\` (\`titleHidden\` to hide it), render a ${surface}.Title, or set \`aria-label\`.`
	);
}
