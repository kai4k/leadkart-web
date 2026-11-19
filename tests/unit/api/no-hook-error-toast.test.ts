/**
 * Hooks never toast errors themselves: a failed mutation reaches the ONE global handler
 * (`createQueryClient` MutationCache), which describes it and toasts unless the consumer renders
 * it inline (`INLINE_ERRORS_META`). A hook-level `toast.error` in `queries.ts` is a second toast
 * for the same failure (and a third when a banner shows it too).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function queryFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return queryFiles(path);
		return name === 'queries.ts' ? [path] : [];
	});
}

describe('feature query hooks', () => {
	const files = queryFiles('src/lib/features');

	it('finds the feature query files', () => {
		expect(files.length).toBeGreaterThan(8);
	});

	it.each(files)('%s has no hook-level toast.error', (file) => {
		expect(readFileSync(file, 'utf8')).not.toMatch(/toast\.error\(/);
	});

	it.each(files)('%s spells the inline-errors flag only through the shared constant', (file) => {
		expect(readFileSync(file, 'utf8')).not.toMatch(/skipErrorToast/);
	});
});
