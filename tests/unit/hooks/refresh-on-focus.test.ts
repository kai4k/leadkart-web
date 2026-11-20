import { describe, expect, it, vi } from 'vitest';
import { createStaleGuard } from '#lib/hooks/use-refresh-on-focus.svelte.ts';

describe('createStaleGuard', () => {
	const setup = () => {
		let t = 1_000;
		const run = vi.fn();
		const guard = createStaleGuard(run, 60_000, () => t);
		return { run, guard, at: (ms: number) => void (t = ms) };
	};

	it('does nothing for a quick return', () => {
		const { run, guard, at } = setup();
		at(1_000 + 59_000);
		guard.regained();
		expect(run).not.toHaveBeenCalled();
	});

	it('refreshes when the window comes back after more than a minute', () => {
		const { run, guard, at } = setup();
		at(1_000 + 61_000);
		guard.regained();
		expect(run).toHaveBeenCalledTimes(1);
	});

	it('measures from the last refresh, not from the first load', () => {
		const { run, guard, at } = setup();
		at(62_000);
		guard.regained();
		at(62_000 + 30_000);
		guard.regained();
		expect(run).toHaveBeenCalledTimes(1);
		at(62_000 + 61_000);
		guard.regained();
		expect(run).toHaveBeenCalledTimes(2);
	});
});
