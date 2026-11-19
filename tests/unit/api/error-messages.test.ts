import { describe, expect, it } from 'vitest';
import { getListErrorMessage } from '#lib/api/error-messages.ts';
import { ApiError } from '#lib/api/errors.ts';

const res = (status: number) => new Response(null, { status });

describe('getListErrorMessage', () => {
	it('returns null when there is no error', () => {
		expect(getListErrorMessage(null, 'orders')).toBeNull();
	});
	it('a plain 403 names the resource', () => {
		const err = ApiError.fromResponse(res(403), { error: 'forbidden' });
		expect(getListErrorMessage(err, 'permission requests')).toBe(
			"You don't have permission to view permission requests."
		);
	});
	it.each(['tenant_scope_not_supported', 'tenant_scope_read_only', 'tenant_scope_forbidden'])(
		'%s keeps the tenant-context copy, not "no permission"',
		(code) => {
			const err = ApiError.fromResponse(res(403), { error: code });
			const copy = getListErrorMessage(err, 'permission requests');
			expect(copy).toBe(err.message);
			expect(copy).not.toMatch(/don't have permission to view/);
		}
	);
	it('401, 404 and unknown errors keep their list copy', () => {
		expect(getListErrorMessage(ApiError.fromResponse(res(401), null), 'x')).toBe(
			'Your session expired. Sign in again.'
		);
		expect(getListErrorMessage(ApiError.fromResponse(res(404), null), 'x')).toBe(
			'This resource was deleted or moved.'
		);
		expect(getListErrorMessage(new Error('boom'), 'x')).toBe(
			'Something went wrong. Please try again.'
		);
	});
});
