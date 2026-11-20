import { describe, expect, it } from 'vitest';
import { ownPrincipal } from '#lib/server/principal.ts';

const jar = (values: Record<string, string>) => ({ get: (n: string) => values[n] }) as never;
const seg = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = `${seg({ alg: 'none' })}.${seg({ sub: 'p1', tenant_id: 't1', membership_id: 'm1', exp: 4_000_000_000 })}.s`;

describe('ownPrincipal', () => {
	it('reads the claims of the access cookie', () => {
		expect(ownPrincipal(jar({ lk_access: token }))).toMatchObject({
			personId: 'p1',
			membershipId: 'm1'
		});
	});

	it('no cookies at all: sign in', () => {
		expect(() => ownPrincipal(jar({}))).toThrow(
			expect.objectContaining({ status: 303, location: '/signin' })
		);
	});

	it('only a refresh cookie (the renewal could not reach Go): 503, not a sign-in that loses the form', () => {
		expect(() => ownPrincipal(jar({ lk_refresh: 'r' }))).toThrow(
			expect.objectContaining({ status: 503 })
		);
	});
});
