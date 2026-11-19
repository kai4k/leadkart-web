import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
vi.mock('$ui', () => ({ toast: { success: vi.fn() } }));
import { toast } from '$ui';
import { resourceMutationOptions } from '#lib/api/mutations.ts';

describe('resourceMutationOptions', () => {
	it('awaits invalidation of every key, then toasts', async () => {
		const qc = new QueryClient();
		const spy = vi.spyOn(qc, 'invalidateQueries');
		const opts = resourceMutationOptions(qc, {
			fn: (_: { id: string }) => Promise.resolve(undefined),
			invalidate: ({ id }) => [
				['leads', 'detail', id],
				['leads', 'list']
			],
			successToast: 'Saved'
		});
		await opts.onSuccess?.(undefined, { id: 'a' });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'detail', 'a'] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ['leads', 'list'] });
		expect(toast.success).toHaveBeenCalledWith('Saved');
	});
	it('sets skipErrorToast when the caller shows errors inline', () => {
		const opts = resourceMutationOptions(new QueryClient(), {
			fn: () => Promise.resolve(undefined),
			invalidate: () => [],
			inlineErrors: true
		});
		expect(opts.meta).toEqual({ skipErrorToast: true });
	});
});
