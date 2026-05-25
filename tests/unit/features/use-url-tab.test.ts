/**
 * Unit tests for the `useUrlTab` hook. The hook reads
 * `page.url.searchParams` and writes via `goto`; both `$app/state` and
 * `$app/navigation` are SvelteKit virtual modules so we mock them
 * directly with vitest's `vi.mock` factory.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const gotoSpy = vi.fn();
const pageState = { url: new URL('http://localhost/orders/abc') };

vi.mock('$app/state', () => ({
	get page() {
		return pageState;
	}
}));

vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoSpy(...args)
}));

// Import AFTER the mocks are registered.
import { useUrlTab } from '$lib/hooks/use-url-tab.svelte';

function setUrl(href: string): void {
	pageState.url = new URL(href);
}

describe('useUrlTab.value', () => {
	beforeEach(() => {
		gotoSpy.mockReset();
	});

	it('returns defaultTab when ?tab= is absent', () => {
		setUrl('http://localhost/orders/abc');
		const tab = useUrlTab('items', ['items', 'payments']);
		expect(tab.value).toBe('items');
	});

	it('returns the ?tab= value when present and valid', () => {
		setUrl('http://localhost/orders/abc?tab=payments');
		const tab = useUrlTab('items', ['items', 'payments']);
		expect(tab.value).toBe('payments');
	});

	it('falls back to default when ?tab= value is not in the whitelist', () => {
		setUrl('http://localhost/orders/abc?tab=garbage');
		const tab = useUrlTab('items', ['items', 'payments']);
		expect(tab.value).toBe('items');
	});

	it('accepts any non-empty value when no whitelist is provided', () => {
		setUrl('http://localhost/orders/abc?tab=anything');
		const tab = useUrlTab('items');
		expect(tab.value).toBe('anything');
	});

	it('respects the custom `param` name', () => {
		setUrl('http://localhost/orders/abc?section=invoice');
		const tab = useUrlTab('items', ['items', 'invoice'], 'section');
		expect(tab.value).toBe('invoice');
	});
});

describe('useUrlTab.set', () => {
	beforeEach(() => {
		gotoSpy.mockReset();
	});

	it('appends ?tab=<value> when switching to a non-default tab', () => {
		setUrl('http://localhost/orders/abc');
		const tab = useUrlTab('items', ['items', 'payments']);
		tab.set('payments');
		expect(gotoSpy).toHaveBeenCalledWith('/orders/abc?tab=payments', {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	});

	it('omits ?tab= entirely when switching back to default', () => {
		setUrl('http://localhost/orders/abc?tab=payments');
		const tab = useUrlTab('items', ['items', 'payments']);
		tab.set('items');
		expect(gotoSpy).toHaveBeenCalledWith('/orders/abc', {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	});

	it('preserves OTHER search params when switching tabs', () => {
		setUrl('http://localhost/orders/abc?filter=active');
		const tab = useUrlTab('items', ['items', 'payments']);
		tab.set('payments');
		const [target] = gotoSpy.mock.calls[0] as [string, unknown];
		expect(target).toContain('filter=active');
		expect(target).toContain('tab=payments');
	});
});
