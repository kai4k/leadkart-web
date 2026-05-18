/**
 * Unit tests for the Skeleton primitive — variant compilation.
 *
 * Verifies that the cva variant factory produces the expected
 * class strings without needing DOM / Svelte rendering.
 */
import { describe, expect, it } from 'vitest';
import { skeletonVariants } from '$lib/components/ui/Skeleton.svelte';

describe('skeletonVariants', () => {
	it('default shape is line — has rounded class', () => {
		const cls = skeletonVariants({});
		expect(cls).toContain('rounded');
		expect(cls).toContain('animate-shimmer');
		expect(cls).toContain('bg-bg-muted');
	});

	it('shape=line applies rounded', () => {
		const cls = skeletonVariants({ shape: 'line' });
		expect(cls).toContain('rounded');
		expect(cls).not.toContain('rounded-full');
		expect(cls).not.toContain('rounded-md');
	});

	it('shape=circle applies rounded-full', () => {
		const cls = skeletonVariants({ shape: 'circle' });
		expect(cls).toContain('rounded-full');
	});

	it('shape=rect applies rounded-md', () => {
		const cls = skeletonVariants({ shape: 'rect' });
		expect(cls).toContain('rounded-md');
	});

	it('always includes animate-shimmer regardless of shape', () => {
		for (const shape of ['line', 'circle', 'rect'] as const) {
			expect(skeletonVariants({ shape })).toContain('animate-shimmer');
		}
	});
});
