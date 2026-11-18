import { describe, expect, it, vi } from 'vitest';

// Server side of renderQueryClient: one client per render, dropped at the end.
const destroyCallbacks = vi.hoisted(() => [] as Array<() => void>);

vi.mock('$app/env', () => ({ browser: false, building: false, dev: false }));
vi.mock('svelte', async (importOriginal) => ({
	...(await importOriginal<Record<string, unknown>>()),
	onDestroy: (fn: () => void) => destroyCallbacks.push(fn)
}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$ui', () => ({ toast: { error: vi.fn() } }));
vi.mock('#lib/utils/private-caches.ts', () => ({
	clearPrivateCaches: vi.fn(),
	IMPERSONATION_SESSION_KEY: 'leadkart-impersonation-session'
}));
vi.mock('#lib/api/client.ts', () => ({ api: { delete: vi.fn() } }));

import { renderQueryClient } from '#lib/api/query-client.ts';

describe('renderQueryClient on the server', () => {
	it('gives every render its own client, never a shared one', () => {
		const first = renderQueryClient();
		first.setQueryData(['me', 'capabilities'], { email: 'alice@example.com' });
		const second = renderQueryClient();
		expect(second).not.toBe(first);
		expect(second.getQueryData(['me', 'capabilities'])).toBeUndefined();
	});

	it('clears the request client when the render is destroyed', () => {
		destroyCallbacks.length = 0;
		const client = renderQueryClient();
		client.setQueryData(['me', 'capabilities'], { email: 'alice@example.com' });
		expect(destroyCallbacks).toHaveLength(1);
		destroyCallbacks[0]();
		expect(client.getQueryCache().getAll()).toHaveLength(0);
	});
});
