import { assertNoUnregisteredCalls, expect, test } from './helpers/test';
import { registerMock, resetMock } from './helpers/mock';

// This spec provokes unanswered calls on purpose and checks them itself.
test.use({ allowUnregistered: true });

const MOCK_BASE = process.env.MOCK_BASE ?? 'http://localhost:9999';

test.describe('mock guard: an unregistered call fails the test that triggered it', () => {
	test.beforeEach(async () => {
		await resetMock();
	});

	test('an unanswered call is reported', async () => {
		const resp = await fetch(`${MOCK_BASE}/api/v1/never/registered`);
		expect(resp.status).toBe(404);
		await expect(assertNoUnregisteredCalls()).rejects.toThrow(/GET \/api\/v1\/never\/registered/);
	});

	test('a registered call is not', async () => {
		await registerMock({
			method: 'GET',
			path: '/api/v1/users',
			status: 200,
			body: { users: [], has_more: false }
		});
		await fetch(`${MOCK_BASE}/api/v1/users`);
		await assertNoUnregisteredCalls();
	});

	test('reset clears the record', async () => {
		await fetch(`${MOCK_BASE}/api/v1/never/registered`);
		await resetMock();
		await assertNoUnregisteredCalls();
	});
});
