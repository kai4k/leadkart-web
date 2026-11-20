/**
 * The documented XFF_DEPTH rule is pinned to adapter-node's own handler: the address it reads is
 * `addresses[addresses.length - XFF_DEPTH]` (the hop counted FROM THE RIGHT, which is the end the
 * proxies append to). Too small reads a proxy's own hop (shared bucket, not spoofable); too large
 * reads further left into hops the client wrote (spoofable). The README and .env.example once said
 * it the other way round.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), 'utf8');
const readme = read('README.md');
const section = readme.slice(readme.indexOf('### Client address'), readme.indexOf('### Cookies'));
const envExample = read('.env.example');
const handler = read('node_modules/@sveltejs/adapter-node/src/handler.js');

describe('adapter-node reads the hop XFF_DEPTH places from the right', () => {
	it('the handler source says so (the line the docs quote)', () => {
		expect(handler).toContain('addresses[addresses.length - xff_depth]');
		expect(handler).toContain('xff_depth > addresses.length'); // too large errors only when the client sent fewer
	});
});

describe.each([
	['README "Client address"', section],
	['.env.example', envExample.slice(envExample.indexOf('Client IP behind a proxy'))]
])('%s', (_name, text) => {
	const flat = text.replace(/\s+/g, ' ').replace(/(^| )# ?/g, ' ');

	it('says XFF_DEPTH must equal, never exceed, the number of proxies that append', () => {
		expect(flat).toMatch(/must equal/i);
		expect(flat).toMatch(/never exceed/i);
		expect(flat).toContain('append');
	});

	it('says too SMALL reads a proxy hop (shared bucket) and too LARGE is client-spoofable', () => {
		expect(flat).toMatch(/too small[^.]*proxy/i);
		expect(flat).toMatch(/too large[^.]*(spoof|client)/i);
	});

	it('no longer says a too-small depth is the spoofable one', () => {
		expect(flat).not.toMatch(/too small\)? makes the address client-spoofable/i);
		expect(flat).not.toMatch(/a wrong depth makes the address client-spoofable/i);
	});
});
