import { vi } from 'vitest';

/**
 * Enough of SvelteKit's client router for a leave-guard test: `beforeNavigate` callbacks are collected, and a click on
 * an `<a href>` anywhere runs them as a `link` navigation the way the real router does (a callback may cancel it).
 */
export function fakeRouter() {
	const callbacks: ((nav: {
		type: string;
		willUnload: boolean;
		cancel: () => void;
		to: object;
	}) => void)[] = [];
	const navigated: string[] = [];
	const beforeNavigate = vi.fn((cb: (typeof callbacks)[number]) => {
		callbacks.push(cb);
	});
	const onClick = (e: MouseEvent) => {
		const a = (e.target as Element | null)?.closest('a[href]');
		if (!a) return;
		e.preventDefault();
		let cancelled = false;
		for (const cb of callbacks)
			cb({
				type: 'link',
				willUnload: false,
				to: { route: { id: '/(app)/x' } },
				cancel: () => (cancelled = true)
			});
		if (!cancelled) navigated.push(a.getAttribute('href') ?? '');
	};
	document.addEventListener('click', onClick);
	return {
		beforeNavigate,
		navigated,
		dispose: () => {
			document.removeEventListener('click', onClick);
			callbacks.length = 0;
			navigated.length = 0;
		}
	};
}
