import { describe, expect, it } from 'vitest';
import { isPublicOrigin, renderablePublicOrigin } from '#lib/config/public-origin.ts';
import { variables } from '../../../src/env.ts';

/**
 * PUBLIC_SITE_URL is substituted UNESCAPED into src/app.html (kit write_server.js), so the rule lives where the rendered
 * value is produced (src/env.ts) and is shared with the production start-up check (src/lib/server/config.ts).
 */
const GOOD = [
	'https://app.example.com',
	'https://a.example',
	'http://localhost:4173',
	'https://app.example.com:8443',
	'https://xn--mnchen-3ya.example', // an IDN is written as punycode
	'https://a-b.c-d.example'
];
const HOSTILE: Array<[string, string]> = [
	['an attribute break-out', '"><script>alert(1)</script>'],
	['a quote after a valid origin', 'https://a.example/"onload=alert(1)'],
	['a quote right after the host', 'https://a.example"onload=x'],
	['a path', 'https://a.example/path'],
	['a trailing slash', 'https://app.example.com/'],
	['credentials', 'https://user:pw@a.example'],
	['a protocol-relative URL', '//a.example'],
	['a javascript: URL', ['java', 'script:alert(1)'].join('')],
	['a data: URL', 'data:text/html,<script>1</script>'],
	['an upper-case scheme', 'HTTPS://a.example'],
	['an upper-case host', 'https://A.example'],
	['an IDN written in Unicode', 'https://münchen.example'],
	['a query', 'https://a.example?x=1'],
	['a fragment', 'https://a.example#x'],
	['whitespace', ' https://a.example'],
	['an embedded newline', 'https://a.example\n'],
	['an ampersand', 'https://a.example&x=1'],
	['an angle bracket', 'https://a.example<'],
	['a backslash', 'https://a.example\\x'],
	['a non-numeric port', 'https://a.example:abc'],
	['an IPv6 literal', 'https://[::1]'],
	['a bare host', 'a.example'],
	['an empty string', ''],
	['a different scheme', 'ftp://a.example']
];

describe('isPublicOrigin', () => {
	it.each(GOOD)('accepts %s', (v) => {
		expect(isPublicOrigin(v)).toBe(true);
		expect(renderablePublicOrigin(v)).toBe(v);
	});
	it.each(HOSTILE)('refuses %s', (_name, v) => {
		expect(isPublicOrigin(v)).toBe(false);
		expect(renderablePublicOrigin(v)).toBe('');
	});
	it('refuses a non-string', () => {
		for (const v of [undefined, null, 1, {}, ['https://a.example']])
			expect(renderablePublicOrigin(v)).toBe('');
	});
});

describe('the src/env.ts schema renders only a clean origin', () => {
	// defineEnvVars wraps the schema function as a standard schema: this is the call kit makes when it renders the value
	const schema = (input: unknown): string => {
		const std = (
			variables.PUBLIC_SITE_URL.schema as unknown as {
				'~standard': { validate(v: unknown): { value: string } };
			}
		)['~standard'];
		return std.validate(input).value;
	};
	it.each(GOOD)('passes %s through', (v) => expect(schema(v)).toBe(v));
	it.each(HOSTILE)('renders an empty origin for %s, never the raw value', (_name, v) => {
		expect(schema(v)).toBe('');
	});
	it('renders an unset variable as empty', () => expect(schema(undefined)).toBe(''));
});
