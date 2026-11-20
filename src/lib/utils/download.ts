/**
 * Saving a Blob as a file: the ONE way the app does it (CSV exports). A temporary `<a download>` on
 * an object URL, clicked and removed, with the URL revoked afterwards. Never `window.open` (it would
 * navigate to, and possibly render, whatever the bytes are) and never a plain link (a navigation
 * cannot carry the context header the BFF requires; the Blob comes from `api.getBlob`).
 */

/** The type every CSV export expects; `api.getBlob` re-wraps the response in it. */
export const CSV_TYPE = 'text/csv';

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	a.style.display = 'none';
	document.body.append(a);
	a.click();
	a.remove();
	// After the click has been handled: revoking synchronously can cancel the save in some engines.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
