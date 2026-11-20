const LEGACY_KEYS = ['leadkart-primary', 'leadkart-content-width', 'leadkart-sidebar-collapsed'];

/** One-time cleanup of the keys the old localStorage-based customiser wrote. */
export function removeLegacyThemeKeys(): void {
	try {
		for (const key of LEGACY_KEYS) localStorage.removeItem(key);
	} catch {
		/* storage blocked: nothing to clean */
	}
}
