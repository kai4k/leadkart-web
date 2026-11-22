import { describe, expect, it } from 'vitest';
import { oneShot } from '#lib/utils/one-shot.ts';

describe('oneShot', () => {
	it('gives the value once, then holds nothing', () => {
		const holder = oneShot({ password: 'Secret-1!' });
		expect(holder.take()).toEqual({ password: 'Secret-1!' });
		expect(JSON.stringify(holder)).not.toContain('Secret-1!');
		expect(() => holder.take()).toThrow(/twice/);
	});
});
