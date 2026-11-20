/**
 * The sidebar's open state over the `sidebar` preference (`large | medium | small`). "Closed" is
 * `small` (icon-only); "open" is the size the user last had, so collapsing and expanding a `medium`
 * sidebar returns to `medium`, and a user who starts collapsed expands to `large`.
 *
 * Per-provider state (a closure created by AppShell), never a module value: the server renders many
 * requests in one process.
 */
import type { PreferencesStore } from '$features/preferences';

type Expanded = 'large' | 'medium';

export interface SidebarSizing {
	/** expanded (not icon-only)? Reactive: reads the preference. */
	readonly open: boolean;
	setOpen: (open: boolean) => void;
}

export function createSidebarSizing(prefs: PreferencesStore): SidebarSizing {
	let lastExpanded: Expanded = prefs.sidebar === 'medium' ? 'medium' : 'large';
	return {
		get open() {
			// remember every expanded size the preference takes, wherever it was set (the customizer too)
			if (prefs.sidebar !== 'small') lastExpanded = prefs.sidebar;
			return prefs.sidebar !== 'small';
		},
		setOpen(open) {
			if (prefs.sidebar !== 'small') lastExpanded = prefs.sidebar;
			prefs.set({ sidebar: open ? lastExpanded : 'small' });
		}
	};
}
