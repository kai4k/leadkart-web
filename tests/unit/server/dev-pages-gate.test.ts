/**
 * The developer pages (`(dev)`: the styleguide, the table bench) are not public: the group's layout
 * load answers 404 on every server that is not `vite dev` or the e2e build (NODE_ENV=test). An
 * unset NODE_ENV is production (fail closed), as everywhere else in the server config.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const env = vi.hoisted(() => ({ dev: false, NODE_ENV: undefined as string | undefined }));
vi.mock('$app/env', () => ({
	get dev() {
		return env.dev;
	},
	building: false
}));
vi.mock('$app/env/private', () => ({
	get NODE_ENV() {
		return env.NODE_ENV;
	}
}));

import { load } from '../../../src/routes/(dev)/+layout.server.ts';

const run = () => (load as (e: never) => unknown)({} as never);
afterEach(() => {
	env.dev = false;
	env.NODE_ENV = undefined;
});

describe('(dev) layout: the developer pages exist only for developers and the e2e build', () => {
	it.each([
		['production', false],
		[undefined, false],
		['', false],
		['development', false],
		['staging', false],
		['TEST', false],
		['test ', false]
	])('a built server with NODE_ENV=%j answers 404', (nodeEnv, dev) => {
		env.dev = dev;
		env.NODE_ENV = nodeEnv;
		expect(run).toThrow(expect.objectContaining({ status: 404 }));
	});

	it('the e2e build (NODE_ENV=test) serves them', () => {
		env.NODE_ENV = 'test';
		expect(run()).toEqual({});
	});

	it.each(['development', 'production', undefined])(
		'vite dev serves them whatever NODE_ENV says (%j)',
		(nodeEnv) => {
			env.dev = true;
			env.NODE_ENV = nodeEnv;
			expect(run()).toEqual({});
		}
	);

	it('the 404 says nothing about what is behind it', () => {
		env.NODE_ENV = 'production';
		try {
			run();
			throw new Error('expected a 404');
		} catch (e) {
			expect((e as { body: { message: string } }).body.message).toBe('Not found');
		}
	});
});
