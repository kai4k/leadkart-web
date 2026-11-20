/**
 * The (app) layout's universal load is where the page learns which tenant context it shows: the
 * fingerprint from the server data goes into the API client's holder in the browser (never on the
 * server, where a module value would be shared between requests).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ browser: true }));
vi.mock('$app/env', () => env);

import { pageScopeContext } from '#lib/api/scope-context.ts';
import { load } from '../../../src/routes/(app)/+layout.ts';

const run = (data: object) => (load as unknown as (e: { data: object }) => unknown)({ data });

beforeEach(() => {
	env.browser = true;
	pageScopeContext.set(undefined);
});

describe('(app) layout universal load', () => {
	it('puts the fingerprint of the page data where the API client reads it, and passes the data on', () => {
		const data = { capabilities: {}, inTenantContext: true, scopeContext: 'fp-a' };
		expect(run(data)).toBe(data);
		expect(pageScopeContext.get()).toBe('fp-a');
	});

	it('follows the data when the layout re-runs (another context)', () => {
		run({ scopeContext: 'fp-a' });
		run({ scopeContext: 'none' });
		expect(pageScopeContext.get()).toBe('none');
	});

	it('never writes on the server', () => {
		env.browser = false;
		run({ scopeContext: 'fp-a' });
		expect(pageScopeContext.get()).toBeUndefined();
	});
});
