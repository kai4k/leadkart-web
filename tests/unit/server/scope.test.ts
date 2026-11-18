import { describe, expect, it } from 'vitest';
import { getOperatorScope, setOperatorScope } from '#lib/server/scope.ts';

function jar(initial?: string) {
	let value = initial;
	return {
		get value() {
			return value;
		},
		api: {
			get: () => value,
			set: (_n: string, v: string) => {
				value = v;
			},
			delete: () => {
				value = undefined;
			}
		} as never
	};
}
const scope = {
	id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
	slug: 'acme',
	display_name: 'Acme Pharma'
};

describe('operator scope cookie', () => {
	it('round-trips a signed value', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		expect(getOperatorScope(j.api)).toEqual(scope);
	});

	it('rejects a hand-written unsigned JSON cookie', () => {
		expect(getOperatorScope(jar(JSON.stringify(scope)).api)).toBeNull();
	});

	it('rejects a payload changed after signing', () => {
		const j = jar();
		setOperatorScope(j.api, scope);
		const [, sig] = j.value!.split('.');
		const forged = Buffer.from(
			JSON.stringify({ ...scope, id: '11111111-1111-4111-8111-111111111111' })
		).toString('base64url');
		expect(getOperatorScope(jar(`${forged}.${sig}`).api)).toBeNull();
	});

	it('refuses to sign a non-UUID id (path-injection guard)', () => {
		expect(() => setOperatorScope(jar().api, { ...scope, id: '../../admin' })).toThrow();
	});
});
