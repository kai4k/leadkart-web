import { afterEach, describe, expect, it, vi } from 'vitest';
import { listMyActivity, listTenantActivity } from '#lib/features/audit/api.ts';
import { searchPersons } from '#lib/features/operator/people/api.ts';

afterEach(() => vi.unstubAllGlobals());

const TENANT = '11111111-1111-4111-8111-111111111111';
const EVENT = {
	id: '22222222-2222-4222-8222-222222222222',
	action: 'identity.tenant.suspend',
	actor_id: '33333333-3333-4333-8333-333333333333',
	tenant_id: TENANT,
	correlation_id: '44444444-4444-4444-8444-444444444444',
	occurred_at: '2026-11-20T10:00:00Z',
	duration_ms: 12,
	succeeded: false,
	failure_reason: 'tenant_already_suspended',
	payload: { reason: 'billing' }
};

function answer(body: unknown) {
	const fetchMock = vi.fn().mockResolvedValue(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		})
	);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('audit gateway: the tenant feed', () => {
	it("asks Go's route, /v1/tenants/{tenantId}/audit/events, with cursor and page_size", async () => {
		const fetchMock = answer({ events: [], has_more: false });
		await listTenantActivity(TENANT, { cursor: 'abc', pageSize: 25 });
		expect(fetchMock.mock.calls[0]![0]).toBe(
			`/api/v1/tenants/${TENANT}/audit/events?cursor=abc&page_size=25`
		);
	});

	it("maps Go's page (events, has_more, next_cursor) to the timeline's entries", async () => {
		answer({ events: [EVENT], has_more: true, next_cursor: 'next' });
		expect(await listTenantActivity(TENANT)).toEqual({
			items: [
				{
					id: EVENT.id,
					event_type: 'identity.tenant.suspend',
					actor_id: EVENT.actor_id,
					occurred_at: EVENT.occurred_at,
					succeeded: false,
					failure_reason: 'tenant_already_suspended',
					trace_id: EVENT.correlation_id,
					payload: { reason: 'billing' }
				}
			],
			next_cursor: 'next'
		});
	});

	it('an event with only the required fields: no actor, no reference, an empty payload', async () => {
		answer({
			events: [
				{
					id: EVENT.id,
					action: 'outbox.dispatch',
					occurred_at: EVENT.occurred_at,
					duration_ms: 3,
					succeeded: true
				}
			],
			has_more: false
		});
		const page = await listTenantActivity(TENANT);
		expect(page.items[0]).toMatchObject({
			actor_id: null,
			failure_reason: null,
			trace_id: null,
			payload: {},
			succeeded: true
		});
	});

	it('the last page has no next cursor, whatever Go left in the field', async () => {
		answer({ events: [], has_more: false, next_cursor: 'stale' });
		expect((await listTenantActivity(TENANT)).next_cursor).toBeNull();
	});

	it('the old web shape ({ items }) is not an answer: the gateway refuses it', async () => {
		answer({ items: [], next_cursor: null });
		await expect(listTenantActivity(TENANT)).rejects.toThrow();
	});
});

describe('audit gateway: my own feed', () => {
	it('asks /v1/auth/me/activity and reads the same page', async () => {
		const fetchMock = answer({ events: [EVENT], has_more: false });
		const page = await listMyActivity();
		expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/auth/me/activity');
		expect(page.items.map((e) => e.event_type)).toEqual(['identity.tenant.suspend']);
		expect(page.next_cursor).toBeNull();
	});
});

describe('people gateway: a search that ran out of time', () => {
	it('has_partial travels with the hits', async () => {
		answer({ persons: [], tenants: [], has_partial: true });
		expect(await searchPersons('slowquery')).toEqual({ persons: [], has_partial: true });
	});

	it('a search that finished says so', async () => {
		answer({ persons: [], tenants: [], has_partial: false });
		expect(await searchPersons('nobody')).toEqual({ persons: [], has_partial: false });
	});
});
