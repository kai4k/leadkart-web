/**
 * Saving a Blob: one helper (`<a download>` + revoke), never `window.open`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CSV_TYPE, downloadBlob } from '#lib/utils/download.ts';

beforeEach(() => {
	vi.useFakeTimers();
	URL.createObjectURL = vi.fn(() => 'blob:fake');
	URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('downloadBlob', () => {
	it('clicks one <a download> on an object URL, removes it, and revokes the URL afterwards', () => {
		const clicks: Array<{ download: string; href: string }> = [];
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			clicks.push({ download: this.download, href: this.href });
			expect(document.body.contains(this)).toBe(true);
		});
		const open = vi.spyOn(window, 'open');
		const blob = new Blob(['a,b'], { type: CSV_TYPE });
		downloadBlob(blob, 'leads.csv');
		expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
		expect(clicks).toEqual([{ download: 'leads.csv', href: 'blob:fake' }]);
		expect(document.querySelector('a[download]')).toBeNull(); // removed
		expect(URL.revokeObjectURL).not.toHaveBeenCalled(); // not before the click has been handled
		vi.runAllTimers();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
		expect(open).not.toHaveBeenCalled();
	});
});
