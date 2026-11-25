/** Nothing a person reads is under 12px: `--text-2xs` (10-11px) may not style text in the ui primitives. */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] =>
	readdirSync(d).flatMap((n) =>
		statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]
	);

describe('12px type floor in src/lib/components/ui', () => {
	it('no primitive uses text-2xs or var(--text-2xs)', () => {
		const hits = walk('src/lib/components/ui')
			.filter((f) => /\.(svelte|ts)$/.test(f))
			.filter((f) => /text-2xs|--text-2xs/.test(readFileSync(f, 'utf8')));
		expect(hits).toEqual([]);
	});
});
