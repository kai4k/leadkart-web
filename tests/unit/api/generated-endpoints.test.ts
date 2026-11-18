import { describe, expect, it } from 'vitest';
import { endpoints } from '#lib/api/generated/index.ts';

const find = (method: string, path: string) =>
	endpoints.find((e) => e.method === method && e.path === path);

describe('generated endpoint map', () => {
	it('contains the CRM, orders and inventory routes from api/openapi.yaml', () => {
		expect(find('get', '/api/v1/crm/leads/:leadId')).toBeDefined();
		expect(find('get', '/api/v1/orders/orders/:orderId')).toBeDefined();
		expect(find('get', '/api/v1/inventory/batches/:batchId/movements')).toBeDefined();
	});
	it('marks 204 routes as bodyless', () => {
		const stage = find('post', '/api/v1/crm/leads/:leadId/stage');
		expect(stage?.response.safeParse(undefined).success).toBe(true);
	});
	it('keeps body schemas for 200 routes', () => {
		const list = find('get', '/api/v1/users');
		expect(list?.response.safeParse({ users: [], has_more: false }).success).toBe(true);
		expect(list?.response.safeParse(undefined).success).toBe(false);
	});
});
